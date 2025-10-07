from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, validator

from app.models.document import ProcessingStatus


class DocumentBase(BaseModel):
    """Base document schema."""
    filename: str
    original_filename: str
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    abstract: Optional[str] = None
    doi: Optional[str] = None
    publication_year: Optional[int] = Field(None, ge=1000, le=2100)
    journal: Optional[str] = None
    keywords: Optional[List[str]] = None


class DocumentCreate(DocumentBase):
    """Schema for creating a new document."""
    file_hash: str
    file_size_bytes: int = Field(gt=0)
    original_filename: str
    storage_path: str
    
    @validator('file_size_bytes')
    def validate_file_size(cls, v):
        max_size = 50 * 1024 * 1024  # 50MB
        if v > max_size:
            raise ValueError(f'File size must be less than {max_size} bytes')
        return v


class DocumentUploadResponse(BaseModel):
    """Schema for document upload response."""
    document_id: UUID
    upload_url: str
    expires_at: datetime
    max_file_size_bytes: int
    
    class Config:
        from_attributes = True


class DocumentChunkBase(BaseModel):
    """Base schema for document chunks."""
    content: str = Field(min_length=1)
    chunk_index: int = Field(ge=0)
    page_number: Optional[int] = Field(None, ge=1)
    section_title: Optional[str] = None
    section_type: Optional[str] = None


class DocumentChunkCreate(DocumentChunkBase):
    """Schema for creating document chunks."""
    document_id: UUID
    content_length: int = Field(gt=0)
    embedding: Optional[List[float]] = None
    token_count: Optional[int] = Field(None, ge=0)
    overlap_before: int = Field(default=0, ge=0)
    overlap_after: int = Field(default=0, ge=0)


class DocumentChunkResponse(DocumentChunkBase):
    """Schema for document chunk response."""
    id: UUID
    document_id: UUID
    content_length: int
    embedding_model: str
    embedding_model_version: str
    token_count: Optional[int] = None
    overlap_before: int
    overlap_after: int
    semantic_density: Optional[float] = None
    readability_score: Optional[float] = None
    created_at: datetime
    
    # Computed properties
    has_embedding: bool
    embedding_dimension: int
    
    class Config:
        from_attributes = True


class DocumentSearchResult(BaseModel):
    """Schema for document search results."""
    chunk_id: UUID
    document_id: UUID
    document_title: Optional[str] = None
    content: str
    similarity_score: float = Field(ge=0.0, le=1.0)
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    section_type: Optional[str] = None
    
    class Config:
        from_attributes = True


class DocumentProcessingProgress(BaseModel):
    """Schema for document processing progress."""
    document_id: UUID
    status: ProcessingStatus
    progress_percentage: float = Field(ge=0.0, le=100.0)
    current_step: str
    steps_completed: int
    total_steps: int
    estimated_completion_time: Optional[datetime] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True