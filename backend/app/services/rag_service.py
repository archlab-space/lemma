"""
RAG (Retrieval-Augmented Generation) Service for Lemma
Handles document-based question answering using vector retrieval and LLM generation.
"""

import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple
from uuid import UUID
from dataclasses import dataclass
import json
import re
from datetime import datetime

from app.core.logging import get_logger
from app.core.config import get_settings
from .embedding_service import embedding_service, EmbeddingError
from .vector_storage import vector_storage, VectorStorageError
from .chat_service import chat_service, ChatServiceError
from app.utils.llm_client import call_llm_structured
from app.models.chat import MessageRole
from pydantic import BaseModel

logger = get_logger(__name__)
settings = get_settings()


class RAGConfig:
    """Configuration for RAG operations."""
    DEFAULT_RETRIEVAL_LIMIT = getattr(settings, 'RAG_RETRIEVAL_LIMIT', 10)
    MIN_SIMILARITY_THRESHOLD = getattr(settings, 'RAG_MIN_SIMILARITY', 0.7)
    MAX_CONTEXT_TOKENS = getattr(settings, 'RAG_MAX_CONTEXT_TOKENS', 8000)
    MAX_CONTEXT_CHUNKS = getattr(settings, 'RAG_MAX_CONTEXT_CHUNKS', 8)
    DEFAULT_STREAMING_MODEL = getattr(settings, 'RAG_STREAMING_MODEL', 'openrouter/openai/gpt-4o-mini')
    RERANK_TOP_K = getattr(settings, 'RAG_RERANK_TOP_K', 5)


class RAGError(Exception):
    """Exception for RAG-related errors."""
    pass


@dataclass
class RetrievedChunk:
    """Represents a retrieved document chunk with metadata."""
    id: str
    document_id: str
    content: str
    similarity_score: float
    page_number: int
    chunk_index: int
    document_title: Optional[str] = None
    document_filename: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ContextualAnswer(BaseModel):
    """Structured answer with sources and confidence."""
    answer: str
    confidence: float  # 0.0 to 1.0
    sources_used: List[str]  # List of chunk IDs used
    reasoning: Optional[str] = None
    limitations: Optional[str] = None


class AnswerQuality(BaseModel):
    """Answer quality assessment."""
    overall_score: float  # 0.0 to 1.0
    relevance_score: float
    completeness_score: float
    clarity_score: float
    source_coverage: float
    issues: List[str] = []


class RAGService:
    """
    Retrieval-Augmented Generation service for document Q&A.
    
    Features:
    - Semantic search using embeddings
    - Context ranking and filtering
    - Streaming LLM responses
    - Answer quality assessment
    - Source attribution
    """
    
    def __init__(self):
        self.embedding_service = embedding_service
        self.vector_storage = vector_storage
    
    async def ask_question_with_session(
        self,
        question: str,
        session_id: UUID,
        user_id: UUID,
        streaming: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        Ask a question with chat session context and store the conversation.
        
        Args:
            question: The user's question
            session_id: Chat session ID
            user_id: User ID
            streaming: Whether to stream the response
            
        Yields:
            Streaming response tokens
        """
        retrieval_start_time = datetime.now()
        processing_start_time = None
        retrieved_chunks = []
        session = None
        retrieval_duration_ms = None
        
        try:
            # Get session configuration
            session = await chat_service.get_session(session_id, user_id)
            if not session:
                yield "Error: Chat session not found."
                return
            
            # Store user message
            await chat_service.add_message(
                session_id=session_id,
                user_id=user_id,
                content=question,
                role=MessageRole.USER
            )
            
            logger.info(f"Processing question in session {session_id}: {question[:100]}...")
            
            # Step 1: Retrieve relevant chunks
            retrieved_chunks = await self._retrieve_relevant_chunks(
                question, 
                session.document_id, 
                session.max_tokens // 200,  # Estimate chunks from max tokens
                RAGConfig.MIN_SIMILARITY_THRESHOLD
            )
            
            retrieval_duration_ms = int((datetime.now() - retrieval_start_time).total_seconds() * 1000)
            processing_start_time = datetime.now()
            
            if not retrieved_chunks:
                response = "I couldn't find any relevant information to answer your question. Please make sure you've uploaded documents that contain information related to your query."
                
                # Store assistant message
                await chat_service.add_message(
                    session_id=session_id,
                    user_id=user_id,
                    content=response,
                    role=MessageRole.ASSISTANT,
                    token_count=len(response.split()),
                    model_used=session.model_used,
                    retrieval_time_ms=retrieval_duration_ms,
                    processing_time_ms=0
                )
                
                yield response
                return
            
            # Step 2: Rank and filter context
            context_chunks = await self._rank_and_filter_context(question, retrieved_chunks)
            
            # Step 3: Generate streaming response and collect tokens
            response_parts = []
            
            async for token in self._generate_streaming_answer(question, context_chunks):
                response_parts.append(token)
                yield token
            
            # Calculate processing time
            processing_duration_ms = int((datetime.now() - processing_start_time).total_seconds() * 1000)
            response_text = "".join(response_parts)
            
            # Store assistant message with full context
            chunk_ids = [UUID(chunk.id) for chunk in context_chunks if chunk.id]
            
            await chat_service.add_message(
                session_id=session_id,
                user_id=user_id,
                content=response_text,
                role=MessageRole.ASSISTANT,
                token_count=len(response_text.split()),
                retrieved_chunks=chunk_ids,
                retrieval_query=question,
                retrieval_score=sum(chunk.similarity_score for chunk in context_chunks) / len(context_chunks) if context_chunks else 0.0,
                model_used=session.model_used,
                retrieval_time_ms=retrieval_duration_ms,
                processing_time_ms=processing_duration_ms
            )
                
        except Exception as e:
            logger.error(f"RAG question processing failed: {str(e)}")
            error_message = f"I apologize, but I encountered an error while processing your question: {str(e)}"
            
            # Store error message
            try:
                await chat_service.add_message(
                    session_id=session_id,
                    user_id=user_id,
                    content=error_message,
                    role=MessageRole.ASSISTANT,
                    token_count=len(error_message.split()),
                    model_used=session.model_used if session else None,
                    retrieval_time_ms=retrieval_duration_ms,
                    processing_time_ms=0
                )
            except Exception as store_error:
                logger.error(f"Failed to store error message: {str(store_error)}")
            
            yield error_message
    
    async def ask_question_sync_with_context(
        self,
        question: str,
        document_id: Optional[UUID] = None,
        max_chunks: Optional[int] = None,
        min_similarity: Optional[float] = None
    ) -> Tuple[str, List[RetrievedChunk]]:
        """
        Ask a question and return complete response with context chunks.
        
        Returns:
            Tuple of (complete_answer, retrieved_chunks)
        """
        try:
            logger.info(f"Processing question (sync with context): {question[:100]}...")
            
            # Step 1: Retrieve relevant chunks
            retrieved_chunks = await self._retrieve_relevant_chunks(
                question, 
                document_id, 
                max_chunks or RAGConfig.MAX_CONTEXT_CHUNKS,
                min_similarity or RAGConfig.MIN_SIMILARITY_THRESHOLD
            )
            
            if not retrieved_chunks:
                return "I couldn't find any relevant information to answer your question. Please make sure you've uploaded documents that contain information related to your query.", []
            
            # Step 2: Rank and filter context
            context_chunks = await self._rank_and_filter_context(question, retrieved_chunks)
            
            # Step 3: Generate complete response
            response_parts = []
            async for token in self._generate_streaming_answer(question, context_chunks):
                response_parts.append(token)
            
            complete_answer = "".join(response_parts)
            return complete_answer, context_chunks
            
        except Exception as e:
            logger.error(f"RAG question processing failed: {str(e)}")
            error_message = f"I apologize, but I encountered an error while processing your question: {str(e)}"
            return error_message, []

    async def ask_question(
        self,
        question: str,
        document_id: Optional[UUID] = None,
        max_chunks: Optional[int] = None,
        min_similarity: Optional[float] = None,
        streaming: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        Ask a question about document(s) with streaming response.
        
        Args:
            question: The user's question
            document_id: Optional specific document to search (None for all documents)
            max_chunks: Maximum chunks to retrieve
            min_similarity: Minimum similarity threshold
            streaming: Whether to stream the response
            
        Yields:
            Streaming response tokens
        """
        try:
            logger.info(f"Processing question: {question[:100]}...")
            
            # Step 1: Retrieve relevant chunks
            retrieved_chunks = await self._retrieve_relevant_chunks(
                question, 
                document_id, 
                max_chunks or RAGConfig.MAX_CONTEXT_CHUNKS,
                min_similarity or RAGConfig.MIN_SIMILARITY_THRESHOLD
            )
            
            if not retrieved_chunks:
                yield "I couldn't find any relevant information to answer your question. Please make sure you've uploaded documents that contain information related to your query."
                return
            
            # Step 2: Rank and filter context
            context_chunks = await self._rank_and_filter_context(question, retrieved_chunks)
            
            # Step 3: Generate streaming response
            async for token in self._generate_streaming_answer(question, context_chunks):
                yield token
                
        except Exception as e:
            logger.error(f"RAG question processing failed: {str(e)}")
            yield f"I apologize, but I encountered an error while processing your question: {str(e)}"
    
    async def _retrieve_relevant_chunks(
        self,
        question: str,
        document_id: Optional[UUID] = None,
        max_chunks: int = RAGConfig.MAX_CONTEXT_CHUNKS,
        min_similarity: float = RAGConfig.MIN_SIMILARITY_THRESHOLD
    ) -> List[RetrievedChunk]:
        """Retrieve relevant document chunks using semantic search."""
        try:
            # Generate embedding for the question
            question_embedding = await self.embedding_service.generate_embedding(question)
            
            # Search for similar chunks
            similar_chunks = await self.vector_storage.similarity_search(
                query_embedding=question_embedding,
                document_id=document_id,
                limit=max_chunks * 2,  # Get more for better ranking
                min_similarity=min_similarity
            )
            
            # Convert to RetrievedChunk objects
            retrieved_chunks = []
            for chunk in similar_chunks:
                retrieved_chunk = RetrievedChunk(
                    id=chunk['id'],
                    document_id=chunk['document_id'],
                    content=chunk['content'],
                    similarity_score=chunk['similarity_score'],
                    page_number=chunk['page_number'],
                    chunk_index=chunk['chunk_index'],
                    document_title=chunk.get('document_title'),
                    document_filename=chunk.get('document_filename'),
                    metadata=chunk.get('metadata', {})
                )
                retrieved_chunks.append(retrieved_chunk)
            
            logger.info(f"Retrieved {len(retrieved_chunks)} chunks for question")
            return retrieved_chunks
            
        except EmbeddingError as e:
            logger.error(f"Failed to generate question embedding: {str(e)}")
            raise RAGError(f"Question embedding failed: {str(e)}") from e
        except VectorStorageError as e:
            logger.error(f"Vector search failed: {str(e)}")
            raise RAGError(f"Document search failed: {str(e)}") from e
        except Exception as e:
            logger.error(f"Chunk retrieval failed: {str(e)}")
            raise RAGError(f"Failed to retrieve relevant chunks: {str(e)}") from e
    
    async def _rank_and_filter_context(
        self, 
        question: str, 
        chunks: List[RetrievedChunk]
    ) -> List[RetrievedChunk]:
        """Rank and filter chunks to optimize context window usage."""
        if not chunks:
            return []
        
        # Sort by similarity score (highest first)
        ranked_chunks = sorted(chunks, key=lambda x: x.similarity_score, reverse=True)
        
        # Apply diversity filtering to avoid redundant chunks
        filtered_chunks = self._apply_diversity_filtering(ranked_chunks)
        
        # Limit by token budget
        context_chunks = self._limit_by_token_budget(filtered_chunks)
        
        # Reorder chronologically by page/chunk for better context
        final_chunks = sorted(context_chunks, key=lambda x: (x.page_number, x.chunk_index))
        
        logger.info(f"Selected {len(final_chunks)} chunks for context after ranking and filtering")
        return final_chunks
    
    def _apply_diversity_filtering(self, chunks: List[RetrievedChunk]) -> List[RetrievedChunk]:
        """Filter out highly similar chunks to improve context diversity."""
        if len(chunks) <= RAGConfig.RERANK_TOP_K:
            return chunks
        
        filtered_chunks = [chunks[0]]  # Always include the most similar
        
        for chunk in chunks[1:]:
            # Check if this chunk is too similar to already selected chunks
            is_diverse = True
            for selected_chunk in filtered_chunks:
                # Simple diversity check: different page or significantly different content
                if (chunk.page_number == selected_chunk.page_number and 
                    abs(chunk.chunk_index - selected_chunk.chunk_index) <= 2):
                    # Chunks are too close to each other
                    content_overlap = self._calculate_content_overlap(chunk.content, selected_chunk.content)
                    if content_overlap > 0.7:  # 70% content overlap threshold
                        is_diverse = False
                        break
            
            if is_diverse:
                filtered_chunks.append(chunk)
                
            if len(filtered_chunks) >= RAGConfig.RERANK_TOP_K:
                break
        
        return filtered_chunks
    
    def _calculate_content_overlap(self, content1: str, content2: str) -> float:
        """Calculate content overlap between two text chunks."""
        words1 = set(content1.lower().split())
        words2 = set(content2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0
    
    def _limit_by_token_budget(self, chunks: List[RetrievedChunk]) -> List[RetrievedChunk]:
        """Limit chunks to fit within token budget."""
        # Rough token estimation: 1 token ≈ 4 characters
        estimated_tokens = 0
        selected_chunks = []
        
        for chunk in chunks:
            chunk_tokens = len(chunk.content) // 4
            
            if estimated_tokens + chunk_tokens <= RAGConfig.MAX_CONTEXT_TOKENS:
                selected_chunks.append(chunk)
                estimated_tokens += chunk_tokens
            else:
                logger.debug(f"Stopping at {len(selected_chunks)} chunks due to token budget ({estimated_tokens} tokens)")
                break
        
        return selected_chunks
    
    async def _generate_streaming_answer(
        self, 
        question: str, 
        context_chunks: List[RetrievedChunk]
    ) -> AsyncGenerator[str, None]:
        """Generate streaming answer using retrieved context."""
        try:
            # Prepare context
            context = self._build_context_string(context_chunks)
            
            # Create prompt
            prompt = self._create_qa_prompt(question, context, context_chunks)
            
            # Stream response from LLM
            async for token in self._stream_llm_response(prompt):
                yield token
                
        except Exception as e:
            logger.error(f"Answer generation failed: {str(e)}")
            yield f"I apologize, but I encountered an error while generating the answer: {str(e)}"
    
    def _build_context_string(self, chunks: List[RetrievedChunk]) -> str:
        """Build context string from retrieved chunks."""
        if not chunks:
            return ""
        
        context_parts = []
        current_doc = None
        
        for chunk in chunks:
            # Add document header if switching documents
            if current_doc != chunk.document_id:
                doc_title = chunk.document_title or chunk.document_filename or "Unknown Document"
                context_parts.append(f"\n--- From: {doc_title} ---")
                current_doc = chunk.document_id
            
            # Add chunk content with page reference
            chunk_header = f"[Page {chunk.page_number}]"
            context_parts.append(f"{chunk_header} {chunk.content}")
        
        return "\n\n".join(context_parts)
    
    def _create_qa_prompt(
        self, 
        question: str, 
        context: str, 
        chunks: List[RetrievedChunk]
    ) -> str:
        """Create the Q&A prompt for the LLM."""
        # Get source information
        sources = []
        for chunk in chunks:
            source = chunk.document_title or chunk.document_filename or "Unknown Document"
            page_ref = f"(Page {chunk.page_number})"
            if f"{source} {page_ref}" not in sources:
                sources.append(f"{source} {page_ref}")
        
        sources_text = ", ".join(sources) if sources else "uploaded documents"
        
        prompt = f"""You are a helpful AI assistant that answers questions based on provided document content. Your role is to provide accurate, well-reasoned answers using ONLY the information from the given context.

## INSTRUCTIONS:
1. **Use only the provided context** - Do not use external knowledge
2. **Be precise and accurate** - Quote relevant parts when helpful  
3. **Indicate uncertainty** - If the context doesn't fully answer the question, say so
4. **Reference sources** - Mention which document/page contains relevant information
5. **Be concise but complete** - Provide thorough answers without unnecessary verbosity

## CONTEXT FROM DOCUMENTS:
{context}

## QUESTION:
{question}

## ANSWER:
Based on the provided documents ({sources_text}), here is my response:

"""
        
        return prompt
    
    async def _stream_llm_response(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream response from LLM."""
        try:
            import litellm
            
            # Use OpenAI API key from settings
            api_key = getattr(settings, 'OPENROUTER_API_KEY', None)
            if not api_key:
                raise RAGError("OPENROUTER_API_KEY not configured")
            
            response = await litellm.acompletion(
                model=RAGConfig.DEFAULT_STREAMING_MODEL,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.1,  # Low temperature for consistent, factual responses
                api_key=api_key,
                stream=True  # Enable streaming
            )
            
            # Handle streaming response
            async for chunk in response:  # type: ignore
                # Handle litellm streaming response format
                if hasattr(chunk, 'choices') and chunk.choices:
                    choice = chunk.choices[0]
                    # Check for delta content (streaming format)
                    if hasattr(choice, 'delta') and choice.delta and hasattr(choice.delta, 'content'):
                        content = choice.delta.content
                        if content:
                            yield content
                    # Check for direct content (some models)
                    elif hasattr(choice, 'text'):
                        if choice.text:
                            yield choice.text
            
        except Exception as e:
            logger.error(f"LLM streaming failed: {str(e)}")
            raise RAGError(f"Failed to generate streaming response: {str(e)}") from e
    
    async def get_document_summary(self, document_id: UUID) -> str:
        """Get a summary of a document using RAG."""
        try:
            # Ask a generic summarization question
            summary_question = "Please provide a comprehensive summary of this document, including its main topics, key findings, and conclusions."
            
            # Get response as a single string instead of streaming
            response_parts = []
            async for token in self.ask_question(
                summary_question, 
                document_id=document_id,
                max_chunks=RAGConfig.MAX_CONTEXT_CHUNKS,
                streaming=True
            ):
                response_parts.append(token)
            
            return "".join(response_parts)
            
        except Exception as e:
            logger.error(f"Document summary generation failed: {str(e)}")
            return f"Unable to generate summary: {str(e)}"
    
    async def suggest_questions(self, document_id: UUID) -> List[str]:
        """Suggest relevant questions for a document."""
        try:
            # Get some chunks from the document to understand its content
            chunks = await self.vector_storage.get_document_chunks(document_id)
            
            if not chunks or len(chunks) < 3:
                return [
                    "What is the main topic of this document?",
                    "What are the key findings or conclusions?",
                    "What methodology was used in this research?"
                ]
            
            # Take content from first few chunks to generate suggestions
            sample_content = "\n".join([chunk['content'] for chunk in chunks[:3]])
            
            suggestion_prompt = f"""Based on the following document excerpt, suggest 5 specific, insightful questions that would help a reader understand the key aspects of this document:

Document excerpt:
{sample_content[:1000]}...

Please provide 5 questions as a simple list, one per line, without numbering or bullets."""
            
            # Use structured response to get clean question list
            response_parts = []
            async for token in self._stream_llm_response(suggestion_prompt):
                response_parts.append(token)
            
            suggestions_text = "".join(response_parts).strip()
            
            # Parse questions from response
            questions = [q.strip() for q in suggestions_text.split('\n') if q.strip() and not q.strip().startswith('-')]
            
            return questions[:5]  # Return max 5 questions
            
        except Exception as e:
            logger.error(f"Question suggestion failed: {str(e)}")
            return [
                "What is the main topic of this document?",
                "What are the key findings presented?",
                "What conclusions can be drawn from this research?"
            ]
    
    async def assess_answer_quality(
        self,
        question: str,
        answer: str,
        context_chunks: List[RetrievedChunk]
    ) -> AnswerQuality:
        """Assess the quality of a generated answer."""
        try:
            # Calculate individual quality metrics
            relevance_score = self._calculate_relevance_score(question, answer)
            completeness_score = self._calculate_completeness_score(question, answer, context_chunks)
            clarity_score = self._calculate_clarity_score(answer)
            source_coverage = self._calculate_source_coverage(answer, context_chunks)
            
            # Identify potential issues
            issues = self._identify_answer_issues(question, answer, context_chunks)
            
            # Calculate overall score (weighted average)
            overall_score = (
                relevance_score * 0.35 +
                completeness_score * 0.25 +
                clarity_score * 0.25 +
                source_coverage * 0.15
            )
            
            return AnswerQuality(
                overall_score=overall_score,
                relevance_score=relevance_score,
                completeness_score=completeness_score,
                clarity_score=clarity_score,
                source_coverage=source_coverage,
                issues=issues
            )
            
        except Exception as e:
            logger.error(f"Answer quality assessment failed: {str(e)}")
            # Return default quality scores
            return AnswerQuality(
                overall_score=0.5,
                relevance_score=0.5,
                completeness_score=0.5,
                clarity_score=0.5,
                source_coverage=0.5,
                issues=["Unable to assess answer quality"]
            )
    
    def _calculate_relevance_score(self, question: str, answer: str) -> float:
        """Calculate how relevant the answer is to the question."""
        # Simple keyword overlap analysis
        question_words = set(question.lower().split())
        answer_words = set(answer.lower().split())
        
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'}
        question_words -= stop_words
        answer_words -= stop_words
        
        if not question_words or not answer_words:
            return 0.5
        
        # Calculate Jaccard similarity
        intersection = len(question_words.intersection(answer_words))
        union = len(question_words.union(answer_words))
        
        if union == 0:
            return 0.0
        
        base_score = intersection / union
        
        # Boost score if answer directly addresses question patterns
        if any(word in answer.lower() for word in ['because', 'due to', 'as a result', 'therefore', 'consequently']):
            base_score += 0.1
        
        return min(base_score, 1.0)
    
    def _calculate_completeness_score(self, question: str, answer: str, chunks: List[RetrievedChunk]) -> float:
        """Calculate how complete the answer is given available context."""
        if not chunks:
            return 0.3  # Low score if no context available
        
        # Check answer length relative to context
        total_context_words = sum(len(chunk.content.split()) for chunk in chunks)
        answer_words = len(answer.split())
        
        if total_context_words == 0:
            return 0.3
        
        # Expect answer to be 5-20% of context length for good completeness
        length_ratio = answer_words / total_context_words
        
        if length_ratio < 0.02:  # Too short
            length_score = 0.3
        elif length_ratio > 0.3:  # Too long, might be verbose
            length_score = 0.7
        else:  # Good range
            length_score = 0.9
        
        # Check if answer acknowledges limitations when appropriate
        limitation_words = ['however', 'but', 'although', 'limited', 'unclear', 'not specified', 'insufficient']
        has_limitations = any(word in answer.lower() for word in limitation_words)
        
        # Check for question type indicators
        question_type_score = 1.0
        if question.lower().startswith(('how', 'why', 'explain')):
            # These require more detailed explanations
            if answer_words < 50:
                question_type_score = 0.6
        elif question.lower().startswith(('what', 'when', 'where', 'who')):
            # These can be more concise
            if answer_words < 20:
                question_type_score = 0.7
        
        # Combine scores
        final_score = (length_score * 0.6 + question_type_score * 0.4)
        
        # Small boost for acknowledging limitations when context is limited
        if has_limitations and len(chunks) < 3:
            final_score += 0.1
        
        return min(final_score, 1.0)
    
    def _calculate_clarity_score(self, answer: str) -> float:
        """Calculate how clear and well-structured the answer is."""
        if not answer or len(answer.strip()) < 10:
            return 0.2
        
        # Check basic structure
        sentences = [s.strip() for s in answer.split('.') if s.strip()]
        if len(sentences) < 1:
            return 0.3
        
        # Penalize extremely long sentences (hard to read)
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)
        if avg_sentence_length > 40:
            length_penalty = 0.8
        elif avg_sentence_length > 25:
            length_penalty = 0.9
        else:
            length_penalty = 1.0
        
        # Check for good structure indicators
        structure_score = 0.7  # Base score
        
        # Boost for good transitions
        transition_words = ['first', 'second', 'next', 'then', 'finally', 'additionally', 'furthermore', 'moreover', 'however', 'therefore']
        if any(word in answer.lower() for word in transition_words):
            structure_score += 0.1
        
        # Boost for proper capitalization and punctuation
        if answer[0].isupper() and answer.endswith(('.', '!', '?')):
            structure_score += 0.1
        
        # Check for excessive repetition
        words = answer.lower().split()
        unique_words = len(set(words))
        total_words = len(words)
        
        if total_words > 0:
            repetition_ratio = unique_words / total_words
            if repetition_ratio < 0.6:  # High repetition
                structure_score -= 0.2
        
        final_score = structure_score * length_penalty
        return min(max(final_score, 0.1), 1.0)
    
    def _calculate_source_coverage(self, answer: str, chunks: List[RetrievedChunk]) -> float:
        """Calculate how well the answer utilizes available sources."""
        if not chunks:
            return 0.5  # Neutral score if no sources
        
        # Check if answer references multiple chunks/sources
        chunk_words = []
        for chunk in chunks:
            chunk_words.extend(chunk.content.lower().split())
        
        answer_words = answer.lower().split()
        
        # Count how many unique chunks contribute to the answer
        contributing_chunks = 0
        for chunk in chunks:
            chunk_key_words = set(chunk.content.lower().split())
            answer_word_set = set(answer_words)
            
            # Check overlap between chunk and answer
            overlap = len(chunk_key_words.intersection(answer_word_set))
            if overlap > 5:  # Significant overlap threshold
                contributing_chunks += 1
        
        if len(chunks) == 0:
            return 0.5
        
        coverage_ratio = contributing_chunks / len(chunks)
        
        # Scale the score
        if coverage_ratio >= 0.8:
            return 1.0
        elif coverage_ratio >= 0.5:
            return 0.8
        elif coverage_ratio >= 0.3:
            return 0.6
        else:
            return 0.4
    
    def _identify_answer_issues(
        self, 
        question: str, 
        answer: str, 
        chunks: List[RetrievedChunk]
    ) -> List[str]:
        """Identify potential issues with the answer."""
        issues = []
        
        # Check answer length
        if len(answer.strip()) < 20:
            issues.append("Answer may be too brief")
        elif len(answer.strip()) > 1000:
            issues.append("Answer may be too verbose")
        
        # Check for generic responses
        generic_phrases = [
            "i don't know", "i'm not sure", "it depends", "varies",
            "according to the document", "the document states", "it is mentioned"
        ]
        if any(phrase in answer.lower() for phrase in generic_phrases[:3]):
            issues.append("Answer contains uncertain language")
        
        # Check if answer doesn't use provided context
        if chunks:
            answer_words = set(answer.lower().split())
            context_words = set()
            for chunk in chunks:
                context_words.update(chunk.content.lower().split())
            
            overlap = len(answer_words.intersection(context_words))
            if overlap < 10:  # Very low overlap
                issues.append("Answer may not be based on provided context")
        
        # Check for question-answer mismatch
        question_words = set(question.lower().split())
        answer_words = set(answer.lower().split())
        
        # Remove stop words for better analysis
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        question_words -= stop_words
        answer_words -= stop_words
        
        if len(question_words.intersection(answer_words)) < 2:
            issues.append("Answer may not directly address the question")
        
        return issues


# Singleton instance for application use
rag_service = RAGService()