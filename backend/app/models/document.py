from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from uuid import UUID
from enum import Enum
import json

from ..db.base import Base


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DELETED = "deleted"


class Document(Base):
    """Document model representing an uploaded PDF."""

    @staticmethod
    def _parse_jsonb(value: Union[str, Dict, List, None]) -> Union[Dict, List, None]:
        """Parse JSONB field that may be a JSON string or already parsed object."""
        if value is None:
            return None
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (json.JSONDecodeError, ValueError):
                return None
        return None

    def __init__(
        self,
        id: UUID,
        user_id: UUID,
        filename: str,
        original_filename: str,
        file_size_bytes: int,
        file_hash: str,
        storage_path: str,
        mime_type: str = "application/pdf",
        storage_bucket: str = "lemma-documents",
        title: Optional[str] = None,
        authors: Optional[List[str]] = None,
        abstract: Optional[str] = None,
        doi: Optional[str] = None,
        publication_year: Optional[int] = None,
        journal: Optional[str] = None,
        keywords: Optional[List[str]] = None,
        processing_status: ProcessingStatus = ProcessingStatus.PENDING,
        processing_started_at: Optional[datetime] = None,
        processing_completed_at: Optional[datetime] = None,
        processing_error: Optional[str] = None,
        total_pages: Optional[int] = None,
        total_words: Optional[int] = None,
        total_chunks: int = 0,
        outline: Optional[Union[str, List[Dict[str, Any]]]] = None,
        language: Optional[str] = None,
        enrichment: Optional[Union[str, Dict[str, Any]]] = None,
        embedding_status: Optional[Union[str, Dict[str, Any]]] = None,
        ai_enhancement_status: Optional[Union[str, Dict[str, Any]]] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        deleted_at: Optional[datetime] = None,
        **kwargs
    ):
        self.id = id
        self.user_id = user_id
        self.filename = filename
        self.original_filename = original_filename
        self.file_size_bytes = file_size_bytes
        self.file_hash = file_hash
        self.storage_path = storage_path
        self.mime_type = mime_type
        self.storage_bucket = storage_bucket
        self.title = title
        self.authors = authors or []
        self.abstract = abstract
        self.doi = doi
        self.publication_year = publication_year
        self.journal = journal
        self.keywords = keywords or []
        self.processing_status = processing_status
        self.processing_started_at = processing_started_at
        self.processing_completed_at = processing_completed_at
        self.processing_error = processing_error
        self.total_pages = total_pages
        self.total_words = total_words
        self.total_chunks = total_chunks
        # Parse JSONB fields that may come as strings from asyncpg
        self.outline = self._parse_jsonb(outline)
        self.language = language
        self.enrichment = self._parse_jsonb(enrichment)
        self.embedding_status = self._parse_jsonb(embedding_status)
        self.ai_enhancement_status = self._parse_jsonb(ai_enhancement_status)
        self.created_at = created_at
        self.updated_at = updated_at
        self.deleted_at = deleted_at

        super().__init__(**kwargs)
    
    @property
    def file_size_mb(self) -> float:
        """Get file size in MB."""
        return self.file_size_bytes / (1024 * 1024)
    
    @property
    def is_processed(self) -> bool:
        """Check if document processing is completed."""
        return self.processing_status == ProcessingStatus.COMPLETED
    
    @property
    def is_processing(self) -> bool:
        """Check if document is currently being processed."""
        return self.processing_status == ProcessingStatus.PROCESSING
    
    @property
    def has_failed(self) -> bool:
        """Check if document processing has failed."""
        return self.processing_status == ProcessingStatus.FAILED
    
    @property
    def is_deleted(self) -> bool:
        """Check if document is soft deleted."""
        return self.deleted_at is not None
    
    @property
    def processing_duration_seconds(self) -> Optional[float]:
        """Get processing duration in seconds."""
        if self.processing_started_at and self.processing_completed_at:
            delta = self.processing_completed_at - self.processing_started_at
            return delta.total_seconds()
        return None

    def to_response_dict(self) -> Dict[str, Any]:
        """Convert document to API response dictionary with camelCase keys."""
        return {
            "id": str(self.id),
            "userId": str(self.user_id),
            "filename": self.filename,
            "originalFilename": self.original_filename,
            "fileSizeBytes": self.file_size_bytes,
            "fileHash": self.file_hash,
            "mimeType": self.mime_type,
            "storagePath": self.storage_path,
            "storageBucket": self.storage_bucket,
            "title": self.title,
            "authors": self.authors,
            "abstract": self.abstract,
            "doi": self.doi,
            "publicationYear": self.publication_year,
            "journal": self.journal,
            "keywords": self.keywords,
            "language": self.language,
            "processingStatus": self.processing_status,
            "processingStartedAt": self.processing_started_at.isoformat() if self.processing_started_at else None,
            "processingCompletedAt": self.processing_completed_at.isoformat() if self.processing_completed_at else None,
            "processingError": self.processing_error,
            "totalPages": self.total_pages,
            "totalWords": self.total_words,
            "totalChunks": self.total_chunks,
            "outline": self.outline,
            "enrichment": self.enrichment,
            "embeddingStatus": self.embedding_status,
            "aiEnhancementStatus": self.ai_enhancement_status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class DocumentChunk(Base):
    """Document chunk model with vector embeddings."""
    
    def __init__(
        self,
        id: UUID,
        document_id: UUID,
        user_id: UUID,
        content: str,
        content_length: int,
        chunk_index: int,
        page_number: Optional[int] = None,
        section_title: Optional[str] = None,
        section_type: Optional[str] = None,
        embedding: Optional[List[float]] = None,
        embedding_model: str = "text-embedding-3-small",
        embedding_model_version: str = "v1",
        token_count: Optional[int] = None,
        overlap_before: int = 0,
        overlap_after: int = 0,
        semantic_density: Optional[float] = None,
        readability_score: Optional[float] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        **kwargs
    ):
        self.id = id
        self.document_id = document_id
        self.user_id = user_id
        self.content = content
        self.content_length = content_length
        self.chunk_index = chunk_index
        self.page_number = page_number
        self.section_title = section_title
        self.section_type = section_type
        self.embedding = embedding
        self.embedding_model = embedding_model
        self.embedding_model_version = embedding_model_version
        self.token_count = token_count
        self.overlap_before = overlap_before
        self.overlap_after = overlap_after
        self.semantic_density = semantic_density
        self.readability_score = readability_score
        self.created_at = created_at
        self.updated_at = updated_at
        
        super().__init__(**kwargs)
    
    @property
    def has_embedding(self) -> bool:
        """Check if chunk has an embedding."""
        return self.embedding is not None and len(self.embedding) > 0
    
    @property
    def embedding_dimension(self) -> int:
        """Get embedding dimension."""
        return len(self.embedding) if self.embedding else 0
    
    def get_context_with_overlap(self, prev_chunk: Optional["DocumentChunk"] = None, 
                                next_chunk: Optional["DocumentChunk"] = None) -> str:
        """Get chunk content with overlapping context from adjacent chunks."""
        context = self.content
        
        if prev_chunk and self.overlap_before > 0:
            # Add overlap from previous chunk
            prev_overlap = prev_chunk.content[-self.overlap_before:]
            context = prev_overlap + " " + context
        
        if next_chunk and self.overlap_after > 0:
            # Add overlap from next chunk
            next_overlap = next_chunk.content[:self.overlap_after]
            context = context + " " + next_overlap
        
        return context