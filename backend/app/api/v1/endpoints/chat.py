"""
Chat and RAG endpoints for Lemma API.
Handles document-based question answering using RAG pipeline.
"""

import asyncio
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user_from_headers
from app.core.logging import get_logger
from app.services.rag_service import rag_service, AnswerQuality
from app.services.document_service import document_service
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter()


async def validate_document_ownership(document_id: UUID, user_id: UUID) -> Dict[str, Any]:
    """
    Validate that a document belongs to the specified user.
    Uses DocumentService for validation logic.
    """
    try:
        return await document_service.validate_document_ownership(document_id, user_id)
    except ValueError as e:
        if "not found or access denied" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        elif "not ready for chat" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        elif "no processed content chunks" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))

class ChatMessage(BaseModel):
    """Chat message model for API."""
    question: str = Field(..., min_length=1, max_length=2000, description="User's question")
    document_id: Optional[UUID] = Field(None, description="Optional document ID to limit search scope")
    max_chunks: Optional[int] = Field(None, ge=1, le=20, description="Maximum chunks to retrieve")
    min_similarity: Optional[float] = Field(None, ge=0.0, le=1.0, description="Minimum similarity threshold")


class DocumentSummaryRequest(BaseModel):
    """Request model for document summary."""
    document_id: UUID = Field(..., description="Document ID to summarize")


class DocumentQuestionsRequest(BaseModel):
    """Request model for suggested questions."""
    document_id: UUID = Field(..., description="Document ID for question suggestions")


class ChatResponse(BaseModel):
    """Response model for chat messages."""
    answer: str
    document_id: Optional[str] = None
    sources_used: List[str] = []
    processing_time_ms: float
    quality_assessment: Optional[AnswerQuality] = None


class SummaryResponse(BaseModel):
    """Response model for document summary."""
    summary: str
    document_id: str
    processing_time_ms: float


class SuggestedQuestionsResponse(BaseModel):
    """Response model for suggested questions."""
    questions: List[str]
    document_id: str


class ConversationCreateRequest(BaseModel):
    """Request model for creating a new conversation."""
    document_id: UUID = Field(..., description="Document ID for the conversation")
    title: Optional[str] = Field(None, max_length=200, description="Optional conversation title")
    description: Optional[str] = Field(None, max_length=1000, description="Optional conversation description")
    model_used: Optional[str] = Field(None, max_length=100, description="LLM model to use")
    temperature: Optional[float] = Field(0.1, ge=0.0, le=2.0, description="LLM temperature")
    max_tokens: Optional[int] = Field(2000, ge=100, le=8000, description="Max tokens per response")
    context_window_size: Optional[int] = Field(200000, ge=4000, le=500000, description="Context window size")


class ConversationResponse(BaseModel):
    """Response model for conversation."""
    id: str
    user_id: str
    document_id: str
    title: str
    description: Optional[str]
    status: str
    message_count: int
    total_tokens_used: int
    last_message_at: Optional[str]
    model_used: Optional[str]
    temperature: float
    max_tokens: int
    context_window_size: int
    created_at: str
    updated_at: str


class ConversationListResponse(BaseModel):
    """Response model for conversation list."""
    conversations: List[ConversationResponse]
    total_count: int
    page: int
    page_size: int


class MessageResponse(BaseModel):
    """Response model for chat message."""
    id: str
    session_id: str
    user_id: str
    content: str
    role: str
    sequence_number: int
    token_count: Optional[int]
    retrieved_chunks: Optional[List[str]]
    chunks_used_count: int
    retrieval_query: Optional[str]
    retrieval_score: Optional[float]
    model_used: Optional[str]
    processing_time_ms: Optional[int]
    retrieval_time_ms: Optional[int]
    status: str
    user_rating: Optional[int]
    user_feedback: Optional[str]
    is_helpful: Optional[bool]
    created_at: str
    completed_at: Optional[str]


class ConversationHistoryResponse(BaseModel):
    """Response model for conversation history."""
    conversation: ConversationResponse
    messages: List[MessageResponse]


class MessageFeedbackRequest(BaseModel):
    """Request model for message feedback."""
    message_id: UUID = Field(..., description="Message ID to rate")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating from 1-5")
    feedback: Optional[str] = Field(None, max_length=2000, description="Text feedback")
    is_helpful: Optional[bool] = Field(None, description="Whether the message was helpful")


class SessionQuestionRequest(BaseModel):
    """Request model for session-based questions."""
    question: str = Field(..., min_length=1, max_length=2000, description="User's question")


@router.post("/sessions/{session_id}/ask", response_model=None)
async def ask_question_in_session(
    session_id: UUID,
    request: SessionQuestionRequest,
    current_user: User = Depends(get_current_user_from_headers)
):
    """
    Ask a question in a specific chat session with streaming response.
    
    This endpoint provides session-aware RAG with conversation history.
    """
    try:
        logger.info(f"User {current_user.id} asking in session {session_id}: {request.question[:100]}...")
        
        async def generate_streaming_response():
            """Generate streaming response from RAG service with session context."""
            try:
                async for token in rag_service.ask_question_with_session(
                    question=request.question,
                    session_id=session_id,
                    user_id=current_user.id,
                    streaming=True
                ):
                    # Format as Server-Sent Events (SSE)
                    yield f"data: {token}\n\n"
                
                # End of stream marker
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"Session streaming response generation failed: {str(e)}")
                yield f"data: Error: {str(e)}\n\n"
                yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate_streaming_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )
        
    except Exception as e:
        logger.error(f"Session question processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process question: {str(e)}")


@router.post("/ask", response_model=None)
async def ask_question_streaming(
    message: ChatMessage,
    current_user: User = Depends(get_current_user_from_headers)
):
    """
    Ask a question about document(s) with streaming response.
    
    This endpoint provides real-time streaming responses for a better user experience.
    Note: For conversation history, use the /sessions/{session_id}/ask endpoint instead.
    """
    try:
        logger.info(f"User {current_user.id} asked: {message.question[:100]}...")
        
        # Validate document ownership if document_id is specified
        if message.document_id:
            await validate_document_ownership(message.document_id, current_user.id)
        
        async def generate_streaming_response():
            """Generate streaming response from RAG service."""
            try:
                async for token in rag_service.ask_question(
                    question=message.question,
                    document_id=message.document_id,
                    max_chunks=message.max_chunks,
                    min_similarity=message.min_similarity,
                    streaming=True
                ):
                    # Format as Server-Sent Events (SSE)
                    yield f"data: {token}\n\n"
                
                # End of stream marker
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"Streaming response generation failed: {str(e)}")
                yield f"data: Error: {str(e)}\n\n"
                yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate_streaming_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )
        
    except Exception as e:
        logger.error(f"Question processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process question: {str(e)}")


@router.post("/ask-sync", response_model=ChatResponse)
async def ask_question_sync(
    message: ChatMessage,
    current_user: User = Depends(get_current_user_from_headers),
    include_quality: bool = Query(False, description="Include answer quality assessment")
):
    """
    Ask a question about document(s) with synchronous response.
    
    This endpoint waits for the complete response before returning.
    Useful for testing or when streaming is not needed.
    """
    try:
        import time
        start_time = time.time()
        
        logger.info(f"User {current_user.id} asked (sync): {message.question[:100]}...")
        
        # Validate document ownership if document_id is specified
        if message.document_id:
            await validate_document_ownership(message.document_id, current_user.id)
        
        # Get complete response with context chunks
        answer, context_chunks = await rag_service.ask_question_sync_with_context(
            question=message.question,
            document_id=message.document_id,
            max_chunks=message.max_chunks,
            min_similarity=message.min_similarity
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        # Extract sources from context chunks
        sources_used = []
        for chunk in context_chunks:
            source_info = f"{chunk.document_title or chunk.document_filename or 'Unknown Document'} (Page {chunk.page_number})"
            if source_info not in sources_used:
                sources_used.append(source_info)
        quality_assessment = None
        
        if include_quality and context_chunks:
            quality_assessment = await rag_service.assess_answer_quality(
                question=message.question,
                answer=answer,
                context_chunks=context_chunks
            )
        
        return ChatResponse(
            answer=answer,
            document_id=str(message.document_id) if message.document_id else None,
            sources_used=sources_used,
            processing_time_ms=processing_time,
            quality_assessment=quality_assessment
        )
        
    except Exception as e:
        logger.error(f"Synchronous question processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process question: {str(e)}")


@router.post("/summary", response_model=SummaryResponse)
async def get_document_summary(
    request: DocumentSummaryRequest,
    current_user: User = Depends(get_current_user_from_headers)
):
    """
    Generate a comprehensive summary of a document using RAG.
    """
    try:
        import time
        start_time = time.time()
        
        logger.info(f"User {current_user.id} requested summary for document {request.document_id}")
        
        # Validate document ownership
        await validate_document_ownership(request.document_id, current_user.id)
        
        summary = await rag_service.get_document_summary(request.document_id)
        processing_time = (time.time() - start_time) * 1000
        
        return SummaryResponse(
            summary=summary,
            document_id=str(request.document_id),
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Document summary generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")


@router.post("/suggest-questions", response_model=SuggestedQuestionsResponse)
async def get_suggested_questions(
    request: DocumentQuestionsRequest,
    current_user: User = Depends(get_current_user_from_headers)
):
    """
    Get AI-suggested questions for a document to help users get started.
    """
    try:
        logger.info(f"User {current_user.id} requested questions for document {request.document_id}")
        
        # Validate document ownership
        await validate_document_ownership(request.document_id, current_user.id)
        
        questions = await rag_service.suggest_questions(request.document_id)
        
        return SuggestedQuestionsResponse(
            questions=questions,
            document_id=str(request.document_id)
        )
        
    except Exception as e:
        logger.error(f"Question suggestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to suggest questions: {str(e)}")


@router.get("/health")
async def chat_health():
    """Health check endpoint for chat/RAG functionality."""
    try:
        # Basic health check - could be expanded to test RAG service
        return {
            "status": "healthy",
            "service": "chat",
            "rag_service_available": True
        }
    except Exception as e:
        logger.error(f"Chat service health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Chat service unhealthy")


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    request: ConversationCreateRequest,
    current_user: User = Depends(get_current_user_from_headers)
):
    """Create a new chat conversation."""
    try:
        from app.db.session import get_db_session
        import uuid
        from datetime import datetime
        
        logger.info(f"User {current_user.id} creating conversation for document {request.document_id}")
        
        # Validate document ownership and readiness
        await validate_document_ownership(request.document_id, current_user.id)
        
        # Generate conversation title if not provided
        title = request.title or f"Chat - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        async with get_db_session() as session:
            conversation_id = uuid.uuid4()
            
            await session.execute("""
                INSERT INTO public.chat_sessions (
                    id, user_id, document_id, title, description, 
                    model_used, temperature, max_tokens, context_window_size
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, 
                conversation_id,
                current_user.id,
                request.document_id,
                title,
                request.description,
                request.model_used,
                request.temperature,
                request.max_tokens,
                request.context_window_size
            )
            
            # Fetch the created conversation
            result = await session.fetchrow("""
                SELECT * FROM public.chat_sessions WHERE id = $1
            """, conversation_id)
            
            if not result:
                raise HTTPException(status_code=500, detail="Failed to retrieve created conversation")
            
            return ConversationResponse(
                id=str(result['id']),
                user_id=str(result['user_id']),
                document_id=str(result['document_id']),
                title=result['title'],
                description=result['description'],
                status=result['status'],
                message_count=result['message_count'],
                total_tokens_used=result['total_tokens_used'],
                last_message_at=result['last_message_at'].isoformat() if result['last_message_at'] else None,
                model_used=result['model_used'],
                temperature=result['temperature'],
                max_tokens=result['max_tokens'],
                context_window_size=result['context_window_size'],
                created_at=result['created_at'].isoformat(),
                updated_at=result['updated_at'].isoformat()
            )
            
    except Exception as e:
        logger.error(f"Failed to create conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    current_user: User = Depends(get_current_user_from_headers),
    document_id: Optional[UUID] = Query(None, description="Filter by document ID"),
    status: Optional[str] = Query("active", description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page")
):
    """List user's chat conversations with pagination."""
    try:
        from app.db.session import get_db_session
        
        offset = (page - 1) * page_size
        
        async with get_db_session() as session:
            # Build query conditions
            where_conditions = ["user_id = $1"]
            params: List[Any] = [current_user.id]
            param_count = 1
            
            if document_id:
                param_count += 1
                where_conditions.append(f"document_id = ${param_count}")
                params.append(document_id)
            
            if status:
                param_count += 1
                where_conditions.append(f"status = ${param_count}")
                params.append(status)
            
            where_clause = " AND ".join(where_conditions)
            
            # Get total count
            count_result = await session.fetchrow(f"""
                SELECT COUNT(*) as total 
                FROM public.chat_sessions 
                WHERE {where_clause}
            """, *params)
            
            total_count = count_result['total'] if count_result else 0
            
            # Get conversations
            conversations_result = await session.fetch(f"""
                SELECT * FROM public.chat_sessions 
                WHERE {where_clause}
                ORDER BY last_message_at DESC NULLS LAST, created_at DESC
                LIMIT ${param_count + 1} OFFSET ${param_count + 2}
            """, *params, page_size, offset)
            
            conversations = []
            for row in conversations_result:
                conversations.append(ConversationResponse(
                    id=str(row['id']),
                    user_id=str(row['user_id']),
                    document_id=str(row['document_id']),
                    title=row['title'],
                    description=row['description'],
                    status=row['status'],
                    message_count=row['message_count'],
                    total_tokens_used=row['total_tokens_used'],
                    last_message_at=row['last_message_at'].isoformat() if row['last_message_at'] else None,
                    model_used=row['model_used'],
                    temperature=row['temperature'],
                    max_tokens=row['max_tokens'],
                    context_window_size=row['context_window_size'],
                    created_at=row['created_at'].isoformat(),
                    updated_at=row['updated_at'].isoformat()
                ))
            
            return ConversationListResponse(
                conversations=conversations,
                total_count=total_count,
                page=page,
                page_size=page_size
            )
            
    except Exception as e:
        logger.error(f"Failed to list conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list conversations: {str(e)}")


@router.get("/conversations/{conversation_id}", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user_from_headers),
    limit: int = Query(50, ge=1, le=200, description="Maximum messages to return")
):
    """Get conversation history with messages."""
    try:
        from app.db.session import get_db_session
        
        async with get_db_session() as session:
            # Get conversation
            conversation_result = await session.fetchrow("""
                SELECT * FROM public.chat_sessions 
                WHERE id = $1 AND user_id = $2
            """, conversation_id, current_user.id)
            
            if not conversation_result:
                raise HTTPException(status_code=404, detail="Conversation not found")
            
            # Get messages
            messages_result = await session.fetch("""
                SELECT * FROM public.chat_messages 
                WHERE session_id = $1 
                ORDER BY sequence_number ASC
                LIMIT $2
            """, conversation_id, limit)
            
            conversation = ConversationResponse(
                id=str(conversation_result['id']),
                user_id=str(conversation_result['user_id']),
                document_id=str(conversation_result['document_id']),
                title=conversation_result['title'],
                description=conversation_result['description'],
                status=conversation_result['status'],
                message_count=conversation_result['message_count'],
                total_tokens_used=conversation_result['total_tokens_used'],
                last_message_at=conversation_result['last_message_at'].isoformat() if conversation_result['last_message_at'] else None,
                model_used=conversation_result['model_used'],
                temperature=conversation_result['temperature'],
                max_tokens=conversation_result['max_tokens'],
                context_window_size=conversation_result['context_window_size'],
                created_at=conversation_result['created_at'].isoformat(),
                updated_at=conversation_result['updated_at'].isoformat()
            )
            
            messages = []
            for row in messages_result:
                messages.append(MessageResponse(
                    id=str(row['id']),
                    session_id=str(row['session_id']),
                    user_id=str(row['user_id']),
                    content=row['content'],
                    role=row['role'],
                    sequence_number=row['sequence_number'],
                    token_count=row['token_count'],
                    retrieved_chunks=[str(chunk_id) for chunk_id in row['retrieved_chunks']] if row['retrieved_chunks'] else None,
                    chunks_used_count=row['chunks_used_count'],
                    retrieval_query=row['retrieval_query'],
                    retrieval_score=row['retrieval_score'],
                    model_used=row['model_used'],
                    processing_time_ms=row['processing_time_ms'],
                    retrieval_time_ms=row['retrieval_time_ms'],
                    status=row['status'],
                    user_rating=row['user_rating'],
                    user_feedback=row['user_feedback'],
                    is_helpful=row['is_helpful'],
                    created_at=row['created_at'].isoformat(),
                    completed_at=row['completed_at'].isoformat() if row['completed_at'] else None
                ))
            
            return ConversationHistoryResponse(
                conversation=conversation,
                messages=messages
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get conversation history: {str(e)}")


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user_from_headers),
    permanent: bool = Query(False, description="Permanently delete instead of soft delete")
):
    """Delete or archive a conversation."""
    try:
        from app.db.session import get_db_session
        from datetime import datetime
        
        async with get_db_session() as session:
            # Check if conversation exists and belongs to user
            conversation_result = await session.fetchrow("""
                SELECT id FROM public.chat_sessions 
                WHERE id = $1 AND user_id = $2
            """, conversation_id, current_user.id)
            
            if not conversation_result:
                raise HTTPException(status_code=404, detail="Conversation not found")
            
            if permanent:
                # Permanently delete (CASCADE will delete messages)
                await session.execute("""
                    DELETE FROM public.chat_sessions WHERE id = $1
                """, conversation_id)
                logger.info(f"Permanently deleted conversation {conversation_id}")
            else:
                # Soft delete
                await session.execute("""
                    UPDATE public.chat_sessions 
                    SET status = 'deleted', deleted_at = $2
                    WHERE id = $1
                """, conversation_id, datetime.now())
                logger.info(f"Soft deleted conversation {conversation_id}")
            
            return {"message": "Conversation deleted successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


@router.post("/feedback")
async def submit_message_feedback(
    request: MessageFeedbackRequest,
    current_user: User = Depends(get_current_user_from_headers)
):
    """Submit feedback for a message."""
    try:
        from app.db.session import get_db_session
        
        async with get_db_session() as session:
            # Verify message belongs to user's conversation
            message_result = await session.fetchrow("""
                SELECT cm.id FROM public.chat_messages cm
                JOIN public.chat_sessions cs ON cm.session_id = cs.id
                WHERE cm.id = $1 AND cs.user_id = $2
            """, request.message_id, current_user.id)
            
            if not message_result:
                raise HTTPException(status_code=404, detail="Message not found")
            
            # Update message with feedback
            await session.execute("""
                UPDATE public.chat_messages 
                SET user_rating = $2, user_feedback = $3, is_helpful = $4
                WHERE id = $1
            """, request.message_id, request.rating, request.feedback, request.is_helpful)
            
            logger.info(f"User {current_user.id} submitted feedback for message {request.message_id}")
            return {"message": "Feedback submitted successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")