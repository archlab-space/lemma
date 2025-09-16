from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.chat import ChatSessionStatus, MessageRole, MessageStatus


class ChatSessionBase(BaseModel):
    """Base schema for chat sessions."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class ChatSessionCreate(ChatSessionBase):
    """Schema for creating a new chat session."""
    document_id: UUID
    model_used: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=32000)
    context_window_size: Optional[int] = Field(None, ge=1000, le=32000)
    system_prompt: Optional[str] = None


class ChatSessionUpdate(BaseModel):
    """Schema for updating a chat session."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[ChatSessionStatus] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=32000)
    system_prompt: Optional[str] = None


class ChatSessionResponse(ChatSessionBase):
    """Schema for chat session response."""
    id: UUID
    user_id: UUID
    document_id: UUID
    document_title: Optional[str] = None
    status: ChatSessionStatus
    message_count: int
    total_tokens_used: int
    last_message_at: Optional[datetime] = None
    model_used: Optional[str] = None
    temperature: float
    max_tokens: int
    context_window_size: int
    created_at: datetime
    updated_at: datetime
    
    # Computed properties
    is_active: bool
    is_archived: bool
    average_tokens_per_message: float
    
    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    """Base schema for chat messages."""
    content: str = Field(min_length=1)
    role: MessageRole


class ChatMessageCreate(ChatMessageBase):
    """Schema for creating a new chat message."""
    session_id: UUID


class ChatMessageResponse(ChatMessageBase):
    """Schema for chat message response."""
    id: UUID
    session_id: UUID
    sequence_number: int
    token_count: Optional[int] = None
    retrieved_chunks: List[UUID] = []
    chunks_used_count: int
    retrieval_query: Optional[str] = None
    retrieval_score: Optional[float] = None
    model_used: Optional[str] = None
    model_version: Optional[str] = None
    temperature: Optional[float] = None
    finish_reason: Optional[str] = None
    processing_time_ms: Optional[int] = None
    retrieval_time_ms: Optional[int] = None
    status: MessageStatus
    error_message: Optional[str] = None
    user_rating: Optional[int] = Field(None, ge=1, le=5)
    user_feedback: Optional[str] = None
    is_helpful: Optional[bool] = None
    is_edited: bool
    edit_count: int
    parent_message_id: Optional[UUID] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    # Computed properties
    is_user_message: bool
    is_assistant_message: bool
    has_rag_context: bool
    processing_duration_seconds: Optional[float] = None
    total_processing_time_ms: Optional[int] = None
    
    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    """Schema for chat request."""
    message: str = Field(min_length=1, max_length=10000)
    session_id: Optional[UUID] = None
    document_id: UUID
    
    # Optional parameters to override session defaults
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=8000)
    model: Optional[str] = None
    
    # RAG parameters
    max_chunks: Optional[int] = Field(None, ge=1, le=20)
    similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class ChatResponse(BaseModel):
    """Schema for chat response."""
    message: ChatMessageResponse
    session: ChatSessionResponse
    chunks_used: List[UUID] = []
    
    class Config:
        from_attributes = True


class MessageFeedback(BaseModel):
    """Schema for message feedback."""
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = Field(None, max_length=1000)
    is_helpful: Optional[bool] = None


class ChatStreamChunk(BaseModel):
    """Schema for streaming chat response chunks."""
    type: str  # 'content', 'metadata', 'done', 'error'
    content: Optional[str] = None
    metadata: Optional[dict] = None
    error: Optional[str] = None
    
    class Config:
        from_attributes = True


class ChatSessionStats(BaseModel):
    """Schema for chat session statistics."""
    session_id: UUID
    total_messages: int
    user_messages: int
    assistant_messages: int
    total_tokens: int
    average_response_time_ms: float
    chunks_retrieved_total: int
    average_chunks_per_query: float
    user_rating_average: Optional[float] = None
    helpful_responses_percentage: Optional[float] = None
    
    class Config:
        from_attributes = True