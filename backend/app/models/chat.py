from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum

from ..db.base import Base


class ChatSessionStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EDITED = "edited"


class ChatSession(Base):
    """Chat session model for document interactions."""
    
    def __init__(
        self,
        id: UUID,
        user_id: UUID,
        document_id: UUID,
        title: str = "New Chat",
        description: Optional[str] = None,
        status: ChatSessionStatus = ChatSessionStatus.ACTIVE,
        message_count: int = 0,
        total_tokens_used: int = 0,
        last_message_at: Optional[datetime] = None,
        model_used: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 4000,
        context_window_size: int = 8000,
        system_prompt: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        archived_at: Optional[datetime] = None,
        deleted_at: Optional[datetime] = None,
        **kwargs
    ):
        self.id = id
        self.user_id = user_id
        self.document_id = document_id
        self.title = title
        self.description = description
        self.status = status
        self.message_count = message_count
        self.total_tokens_used = total_tokens_used
        self.last_message_at = last_message_at
        self.model_used = model_used
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.context_window_size = context_window_size
        self.system_prompt = system_prompt
        self.created_at = created_at
        self.updated_at = updated_at
        self.archived_at = archived_at
        self.deleted_at = deleted_at
        
        super().__init__(**kwargs)
    
    @property
    def is_active(self) -> bool:
        """Check if session is active."""
        return self.status == ChatSessionStatus.ACTIVE
    
    @property
    def is_archived(self) -> bool:
        """Check if session is archived."""
        return self.status == ChatSessionStatus.ARCHIVED
    
    @property
    def is_deleted(self) -> bool:
        """Check if session is deleted."""
        return self.status == ChatSessionStatus.DELETED or self.deleted_at is not None
    
    @property
    def average_tokens_per_message(self) -> float:
        """Calculate average tokens per message."""
        if self.message_count == 0:
            return 0.0
        return self.total_tokens_used / self.message_count


class ChatMessage(Base):
    """Chat message model for individual messages in sessions."""
    
    def __init__(
        self,
        id: UUID,
        session_id: UUID,
        user_id: UUID,
        content: str,
        role: MessageRole,
        sequence_number: int,
        token_count: Optional[int] = None,
        retrieved_chunks: Optional[List[UUID]] = None,
        chunks_used_count: int = 0,
        retrieval_query: Optional[str] = None,
        retrieval_score: Optional[float] = None,
        model_used: Optional[str] = None,
        model_version: Optional[str] = None,
        temperature: Optional[float] = None,
        finish_reason: Optional[str] = None,
        processing_time_ms: Optional[int] = None,
        retrieval_time_ms: Optional[int] = None,
        status: MessageStatus = MessageStatus.COMPLETED,
        error_message: Optional[str] = None,
        user_rating: Optional[int] = None,
        user_feedback: Optional[str] = None,
        is_helpful: Optional[bool] = None,
        is_edited: bool = False,
        edit_count: int = 0,
        parent_message_id: Optional[UUID] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        **kwargs
    ):
        self.id = id
        self.session_id = session_id
        self.user_id = user_id
        self.content = content
        self.role = role
        self.sequence_number = sequence_number
        self.token_count = token_count
        self.retrieved_chunks = retrieved_chunks or []
        self.chunks_used_count = chunks_used_count
        self.retrieval_query = retrieval_query
        self.retrieval_score = retrieval_score
        self.model_used = model_used
        self.model_version = model_version
        self.temperature = temperature
        self.finish_reason = finish_reason
        self.processing_time_ms = processing_time_ms
        self.retrieval_time_ms = retrieval_time_ms
        self.status = status
        self.error_message = error_message
        self.user_rating = user_rating
        self.user_feedback = user_feedback
        self.is_helpful = is_helpful
        self.is_edited = is_edited
        self.edit_count = edit_count
        self.parent_message_id = parent_message_id
        self.created_at = created_at
        self.updated_at = updated_at
        self.completed_at = completed_at
        
        super().__init__(**kwargs)
    
    @property
    def is_user_message(self) -> bool:
        """Check if message is from user."""
        return self.role == MessageRole.USER
    
    @property
    def is_assistant_message(self) -> bool:
        """Check if message is from assistant."""
        return self.role == MessageRole.ASSISTANT
    
    @property
    def is_system_message(self) -> bool:
        """Check if message is a system message."""
        return self.role == MessageRole.SYSTEM
    
    @property
    def has_rag_context(self) -> bool:
        """Check if message used RAG context."""
        return len(self.retrieved_chunks) > 0
    
    @property
    def processing_duration_seconds(self) -> Optional[float]:
        """Get processing duration in seconds."""
        if self.processing_time_ms:
            return self.processing_time_ms / 1000.0
        return None
    
    @property
    def total_processing_time_ms(self) -> Optional[int]:
        """Get total processing time including retrieval."""
        if self.processing_time_ms and self.retrieval_time_ms:
            return self.processing_time_ms + self.retrieval_time_ms
        elif self.processing_time_ms:
            return self.processing_time_ms
        elif self.retrieval_time_ms:
            return self.retrieval_time_ms
        return None