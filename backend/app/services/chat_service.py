"""
Chat Service for Lemma
Handles chat session and message management operations.
"""

import asyncio
from typing import List, Dict, Any, Optional, Tuple, Union
from uuid import UUID, uuid4
from datetime import datetime
import json

from app.core.logging import get_logger
from app.db.session import get_db_session
from app.models.chat import ChatSession, ChatMessage, ChatSessionStatus, MessageRole, MessageStatus

logger = get_logger(__name__)


class ChatServiceError(Exception):
    """Exception for chat service related errors."""
    pass


class ChatService:
    """
    Service for managing chat sessions and messages.
    
    Features:
    - Create and manage chat sessions
    - Store and retrieve messages
    - Update session statistics
    - Handle conversation context
    """
    
    async def create_session(
        self,
        user_id: UUID,
        document_id: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        model_used: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2000,
        context_window_size: int = 200000
    ) -> ChatSession:
        """Create a new chat session."""
        try:
            session_id = uuid4()
            
            # Generate default title if not provided
            if not title:
                title = f"Chat - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            
            async with get_db_session() as db_session:
                # Insert new session
                await db_session.execute("""
                    INSERT INTO public.chat_sessions (
                        id, user_id, document_id, title, description, 
                        model_used, temperature, max_tokens, context_window_size,
                        status, message_count, total_tokens_used
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                """, 
                    session_id, user_id, document_id, title, description,
                    model_used, temperature, max_tokens, context_window_size,
                    ChatSessionStatus.ACTIVE.value, 0, 0
                )
                
                # Fetch the created session
                result = await db_session.fetchrow("""
                    SELECT * FROM public.chat_sessions WHERE id = $1
                """, session_id)
                
                if not result:
                    raise ChatServiceError("Failed to retrieve created session")
                
                return self._row_to_chat_session(result)
                
        except Exception as e:
            logger.error(f"Failed to create chat session: {str(e)}")
            raise ChatServiceError(f"Failed to create chat session: {str(e)}") from e
    
    async def get_session(self, session_id: UUID, user_id: UUID) -> Optional[ChatSession]:
        """Get a chat session by ID."""
        try:
            async with get_db_session() as db_session:
                result = await db_session.fetchrow("""
                    SELECT * FROM public.chat_sessions 
                    WHERE id = $1 AND user_id = $2
                """, session_id, user_id)
                
                if result:
                    return self._row_to_chat_session(result)
                return None
                
        except Exception as e:
            logger.error(f"Failed to get chat session {session_id}: {str(e)}")
            raise ChatServiceError(f"Failed to get chat session: {str(e)}") from e
    
    async def list_sessions(
        self,
        user_id: UUID,
        document_id: Optional[UUID] = None,
        status: Optional[ChatSessionStatus] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[ChatSession], int]:
        """List chat sessions with pagination."""
        try:
            async with get_db_session() as db_session:
                # Build query conditions
                where_conditions = ["user_id = $1"]
                params: list[Any] = [user_id]
                param_count = 1
                
                if document_id:
                    param_count += 1
                    where_conditions.append(f"document_id = ${param_count}")
                    params.append(document_id)
                
                if status:
                    param_count += 1
                    where_conditions.append(f"status = ${param_count}")
                    params.append(status.value)
                
                where_clause = " AND ".join(where_conditions)
                
                # Get total count
                count_result = await db_session.fetchrow(f"""
                    SELECT COUNT(*) as total 
                    FROM public.chat_sessions 
                    WHERE {where_clause}
                """, *params)
                
                total_count = count_result['total'] if count_result else 0
                
                # Get sessions
                sessions_result = await db_session.fetch(f"""
                    SELECT * FROM public.chat_sessions 
                    WHERE {where_clause}
                    ORDER BY last_message_at DESC NULLS LAST, created_at DESC
                    LIMIT ${param_count + 1} OFFSET ${param_count + 2}
                """, *params, limit, offset)
                
                sessions = [self._row_to_chat_session(row) for row in sessions_result]
                
                return sessions, total_count
                
        except Exception as e:
            logger.error(f"Failed to list chat sessions: {str(e)}")
            raise ChatServiceError(f"Failed to list chat sessions: {str(e)}") from e
    
    async def update_session(
        self,
        session_id: UUID,
        user_id: UUID,
        **updates
    ) -> Optional[ChatSession]:
        """Update a chat session."""
        try:
            if not updates:
                return await self.get_session(session_id, user_id)
            
            # Build SET clause dynamically
            set_clauses = []
            params: list[Any] = [session_id, user_id]
            param_count = 2
            
            for field, value in updates.items():
                if field in ['title', 'description', 'status', 'model_used', 'temperature', 
                            'max_tokens', 'context_window_size', 'system_prompt']:
                    param_count += 1
                    set_clauses.append(f"{field} = ${param_count}")
                    params.append(value)
            
            if not set_clauses:
                return await self.get_session(session_id, user_id)
            
            # Add updated_at
            param_count += 1
            set_clauses.append(f"updated_at = ${param_count}")
            params.append(datetime.now())
            
            set_clause = ", ".join(set_clauses)
            
            async with get_db_session() as db_session:
                await db_session.execute(f"""
                    UPDATE public.chat_sessions 
                    SET {set_clause}
                    WHERE id = $1 AND user_id = $2
                """, *params)
                
                return await self.get_session(session_id, user_id)
                
        except Exception as e:
            logger.error(f"Failed to update chat session {session_id}: {str(e)}")
            raise ChatServiceError(f"Failed to update chat session: {str(e)}") from e
    
    async def delete_session(
        self,
        session_id: UUID,
        user_id: UUID,
        permanent: bool = False
    ) -> bool:
        """Delete or soft delete a chat session."""
        try:
            async with get_db_session() as db_session:
                if permanent:
                    # Permanent delete (CASCADE will delete messages)
                    result = await db_session.execute("""
                        DELETE FROM public.chat_sessions 
                        WHERE id = $1 AND user_id = $2
                    """, session_id, user_id)
                else:
                    # Soft delete
                    result = await db_session.execute("""
                        UPDATE public.chat_sessions 
                        SET status = $3, deleted_at = $4, updated_at = $4
                        WHERE id = $1 AND user_id = $2
                    """, session_id, user_id, ChatSessionStatus.DELETED.value, datetime.now())
                
                # Check if any rows were affected
                if result and isinstance(result, str) and hasattr(result, 'split'):
                    parts = result.split()
                    if parts and parts[-1].isdigit():
                        return int(parts[-1]) > 0
                    return False
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to delete chat session {session_id}: {str(e)}")
            raise ChatServiceError(f"Failed to delete chat session: {str(e)}") from e
    
    async def add_message(
        self,
        session_id: UUID,
        user_id: UUID,
        content: str,
        role: MessageRole,
        token_count: Optional[int] = None,
        retrieved_chunks: Optional[List[UUID]] = None,
        retrieval_query: Optional[str] = None,
        retrieval_score: Optional[float] = None,
        model_used: Optional[str] = None,
        processing_time_ms: Optional[int] = None,
        retrieval_time_ms: Optional[int] = None
    ) -> ChatMessage:
        """Add a message to a chat session."""
        try:
            message_id = uuid4()
            
            async with get_db_session() as db_session:
                # Get next sequence number
                sequence_result = await db_session.fetchrow("""
                    SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
                    FROM public.chat_messages 
                    WHERE session_id = $1
                """, session_id)
                
                sequence_number = sequence_result['next_seq'] if sequence_result else 1
                
                # Insert message
                await db_session.execute("""
                    INSERT INTO public.chat_messages (
                        id, session_id, user_id, content, role, sequence_number,
                        token_count, retrieved_chunks, chunks_used_count, 
                        retrieval_query, retrieval_score, model_used,
                        processing_time_ms, retrieval_time_ms, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                """,
                    message_id, session_id, user_id, content, role.value, sequence_number,
                    token_count, retrieved_chunks or [], len(retrieved_chunks or []),
                    retrieval_query, retrieval_score, model_used,
                    processing_time_ms, retrieval_time_ms, MessageStatus.COMPLETED.value
                )
                
                # Update session statistics
                await self._update_session_stats(db_session, session_id, token_count or 0)
                
                # Fetch the created message
                result = await db_session.fetchrow("""
                    SELECT * FROM public.chat_messages WHERE id = $1
                """, message_id)
                
                if not result:
                    raise ChatServiceError("Failed to retrieve created message")
                
                return self._row_to_chat_message(result)
                
        except Exception as e:
            logger.error(f"Failed to add message to session {session_id}: {str(e)}")
            raise ChatServiceError(f"Failed to add message: {str(e)}") from e
    
    async def get_messages(
        self,
        session_id: UUID,
        user_id: UUID,
        limit: int = 50,
        before_sequence: Optional[int] = None
    ) -> List[ChatMessage]:
        """Get messages from a chat session."""
        try:
            async with get_db_session() as db_session:
                # Verify session ownership
                session_check = await db_session.fetchrow("""
                    SELECT id FROM public.chat_sessions 
                    WHERE id = $1 AND user_id = $2
                """, session_id, user_id)
                
                if not session_check:
                    raise ChatServiceError("Session not found or access denied")
                
                # Build query
                where_clause = "session_id = $1"
                params: list[Any] = [session_id]
                
                if before_sequence:
                    where_clause += " AND sequence_number < $2"
                    params.append(before_sequence)
                    limit_param = "$3"
                else:
                    limit_param = "$2"
                
                params.append(limit)
                
                messages_result = await db_session.fetch(f"""
                    SELECT * FROM public.chat_messages 
                    WHERE {where_clause}
                    ORDER BY sequence_number ASC
                    LIMIT {limit_param}
                """, *params)
                
                return [self._row_to_chat_message(row) for row in messages_result]
                
        except Exception as e:
            logger.error(f"Failed to get messages for session {session_id}: {str(e)}")
            raise ChatServiceError(f"Failed to get messages: {str(e)}") from e
    
    async def update_message_feedback(
        self,
        message_id: UUID,
        user_id: UUID,
        rating: Optional[int] = None,
        feedback: Optional[str] = None,
        is_helpful: Optional[bool] = None
    ) -> bool:
        """Update message feedback."""
        try:
            async with get_db_session() as db_session:
                # Verify message belongs to user's session
                message_check = await db_session.fetchrow("""
                    SELECT cm.id FROM public.chat_messages cm
                    JOIN public.chat_sessions cs ON cm.session_id = cs.id
                    WHERE cm.id = $1 AND cs.user_id = $2
                """, message_id, user_id)
                
                if not message_check:
                    raise ChatServiceError("Message not found or access denied")
                
                # Update feedback
                await db_session.execute("""
                    UPDATE public.chat_messages 
                    SET user_rating = $2, user_feedback = $3, is_helpful = $4, updated_at = $5
                    WHERE id = $1
                """, message_id, rating, feedback, is_helpful, datetime.now())
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to update message feedback {message_id}: {str(e)}")
            raise ChatServiceError(f"Failed to update message feedback: {str(e)}") from e
    
    async def _update_session_stats(self, db_session: Any, session_id: UUID, tokens_used: int) -> None:
        """Update session message count and token usage."""
        await db_session.execute("""
            UPDATE public.chat_sessions 
            SET message_count = message_count + 1,
                total_tokens_used = total_tokens_used + $2,
                last_message_at = $3,
                updated_at = $3
            WHERE id = $1
        """, session_id, tokens_used, datetime.now())
    
    def _row_to_chat_session(self, row: Any) -> ChatSession:
        """Convert database row to ChatSession model."""
        return ChatSession(
            id=row['id'],
            user_id=row['user_id'],
            document_id=row['document_id'],
            title=row['title'],
            description=row['description'],
            status=ChatSessionStatus(row['status']),
            message_count=row['message_count'],
            total_tokens_used=row['total_tokens_used'],
            last_message_at=row['last_message_at'],
            model_used=row['model_used'],
            temperature=row['temperature'],
            max_tokens=row['max_tokens'],
            context_window_size=row['context_window_size'],
            system_prompt=row['system_prompt'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            archived_at=row['archived_at'],
            deleted_at=row['deleted_at']
        )
    
    def _row_to_chat_message(self, row: Any) -> ChatMessage:
        """Convert database row to ChatMessage model."""
        return ChatMessage(
            id=row['id'],
            session_id=row['session_id'],
            user_id=row['user_id'],
            content=row['content'],
            role=MessageRole(row['role']),
            sequence_number=row['sequence_number'],
            token_count=row['token_count'],
            retrieved_chunks=row['retrieved_chunks'] if row['retrieved_chunks'] is not None else [],
            chunks_used_count=row['chunks_used_count'],
            retrieval_query=row['retrieval_query'],
            retrieval_score=row['retrieval_score'],
            model_used=row['model_used'],
            model_version=row['model_version'],
            temperature=row['temperature'],
            finish_reason=row['finish_reason'],
            processing_time_ms=row['processing_time_ms'],
            retrieval_time_ms=row['retrieval_time_ms'],
            status=MessageStatus(row['status']),
            error_message=row['error_message'],
            user_rating=row['user_rating'],
            user_feedback=row['user_feedback'],
            is_helpful=row['is_helpful'],
            is_edited=row['is_edited'],
            edit_count=row['edit_count'],
            parent_message_id=row['parent_message_id'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            completed_at=row['completed_at']
        )


# Singleton instance for application use
chat_service = ChatService()