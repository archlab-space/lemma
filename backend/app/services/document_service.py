"""
Document service for handling document CRUD operations.
"""

from typing import Optional, List, Dict, Any, Union, TypedDict
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.models.document import Document, ProcessingStatus
from app.schemas.document import DocumentCreate
from app.db.session import get_db_session
from app.core.logging import get_logger

logger = get_logger(__name__)


class DocumentListResult(TypedDict):
    """Type definition for document list result."""
    documents: List[Document]
    total: int
    page: int
    limit: int
    total_pages: int


class DocumentService:
    """Service class for document operations."""
    
    async def create_document(
        self, 
        user_id: UUID, 
        document_data: DocumentCreate,
        document_id: str
    ) -> Document:
        """Create a new document record."""
        
        # Check for existing document with same hash
        existing_doc = await self.get_document_by_hash(user_id, document_data.file_hash)
        
        if existing_doc:
            raise ValueError("Document with this hash already exists")
                
        # Insert into database
        async with get_db_session() as session:
            result = await session.fetch("""
                INSERT INTO public.documents (
                    id, user_id, filename, original_filename, file_size_bytes, 
                    file_hash, storage_path, mime_type, storage_bucket, 
                    processing_status, title, authors, abstract, doi, 
                    publication_year, journal, keywords, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
                ) RETURNING *
            """, 
            UUID(document_id), user_id, document_data.filename, document_data.original_filename,
            document_data.file_size_bytes, document_data.file_hash, document_data.storage_path,
            'application/pdf', 'lemma-documents', ProcessingStatus.PENDING,
            document_data.title, document_data.authors, document_data.abstract,
            document_data.doi, document_data.publication_year, document_data.journal,
            document_data.keywords, datetime.now(timezone.utc), datetime.now(timezone.utc))
            
            row = result[0]
            return Document(**dict(row))
    
    async def get_document_by_hash(self, user_id: UUID, file_hash: str) -> Optional[Document]:
        """Get document by file hash for a specific user."""
        async with get_db_session() as session:
            result = await session.fetch("""
                SELECT * FROM public.documents 
                WHERE user_id = $1 AND file_hash = $2 AND deleted_at IS NULL
            """, user_id, file_hash)
            
            return Document(**dict(result[0])) if result else None
    
    async def get_document_by_id(self, user_id: UUID, document_id: UUID) -> Optional[Document]:
        """Get document by ID for a specific user."""
        async with get_db_session() as session:
            result = await session.fetch("""
                SELECT * FROM public.documents 
                WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
            """, document_id, user_id)
            
            return Document(**dict(result[0])) if result else None
    
    
    async def get_user_documents(
        self,
        user_id: UUID,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[ProcessingStatus] = None
    ) -> DocumentListResult:
        """Get paginated list of user documents."""
        offset = (page - 1) * limit
        
        # Build WHERE conditions and parameters separately for count and query
        conditions = ["user_id = $1", "deleted_at IS NULL"]
        base_params: List[Union[UUID, str, int]] = [user_id]
        param_count = 1
        
        if search:
            param_count += 1
            conditions.append(f"(title ILIKE ${param_count} OR original_filename ILIKE ${param_count})")
            base_params.append(f"%{search}%")
        
        if status:
            param_count += 1
            conditions.append(f"processing_status = ${param_count}")
            base_params.append(status.value)  # Use .value for enum
        
        where_clause = " AND ".join(conditions)
        
        async with get_db_session() as session:
            # Get total count
            count_result = await session.fetchval(f"""
                SELECT COUNT(*) FROM public.documents WHERE {where_clause}
            """, *base_params)
            
            # Get documents with pagination
            query_params = base_params + [limit, offset]
            result = await session.fetch(f"""
                SELECT * FROM public.documents 
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ${param_count + 1} OFFSET ${param_count + 2}
            """, *query_params)
            
            documents = [Document(**dict(row)) for row in result]
            
            total_count = count_result or 0  # Handle None case
            return {
                'documents': documents,
                'total': total_count,
                'page': page,
                'limit': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
    
    async def delete_document(self, user_id: UUID, document_id: UUID) -> bool:
        """Soft delete a document."""
        async with get_db_session() as session:
            result = await session.fetch("""
                UPDATE public.documents 
                SET deleted_at = $3, updated_at = $4
                WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
                RETURNING id
            """, document_id, user_id, datetime.now(timezone.utc), datetime.now(timezone.utc))
            
            return len(result) > 0
    
    async def update_document_status(
        self, 
        document_id: UUID, 
        status: ProcessingStatus,
        error_message: Optional[str] = None
    ) -> Document:
        """Update document processing status."""
        update_fields = ["processing_status = $2", "updated_at = $3"]
        params = [document_id, status, datetime.now(timezone.utc)]
        param_count = 3
        
        if status == ProcessingStatus.PROCESSING:
            param_count += 1
            update_fields.append(f"processing_started_at = ${param_count}")
            params.append(datetime.now(timezone.utc))
        elif status == ProcessingStatus.COMPLETED:
            param_count += 1
            update_fields.append(f"processing_completed_at = ${param_count}")
            params.append(datetime.now(timezone.utc))
            param_count += 1
            update_fields.append(f"processing_error = ${param_count}")
            params.append(None)
        elif status == ProcessingStatus.FAILED and error_message:
            param_count += 1
            update_fields.append(f"processing_error = ${param_count}")
            params.append(error_message)
        
        async with get_db_session() as session:
            result = await session.fetch(f"""
                UPDATE public.documents 
                SET {', '.join(update_fields)}
                WHERE id = $1
                RETURNING *
            """, *params)
            
            if not result:
                raise ValueError("Document not found")
                
            return Document(**dict(result[0]))
    
    async def check_duplicate(self, user_id: UUID, file_hash: str) -> Dict[str, Any]:
        """Check if document with given hash already exists for user."""
        existing_doc = await self.get_document_by_hash(user_id, file_hash)
        
        if not existing_doc:
            return {
                'isDuplicate': False,
                'existingDocument': None
            }
        
        return {
            'isDuplicate': True,
            'existingDocument': {
                'documentId': str(existing_doc.id),
                'filename': existing_doc.filename,
                'originalFilename': existing_doc.original_filename,
                'storagePath': existing_doc.storage_path,
                'processingStatus': existing_doc.processing_status,
                'createdAt': existing_doc.created_at.isoformat() if existing_doc.created_at else None
            }
        }
    
    async def validate_document_ownership(self, document_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """
        Validate that a document belongs to the specified user.
        
        Args:
            document_id: UUID of the document to check
            user_id: UUID of the user
            
        Returns:
            Dictionary with document metadata if valid
            
        Raises:
            ValueError: If document doesn't exist, user doesn't own it, or document isn't ready
        """
        logger = get_logger(__name__)
        
        try:
            async with get_db_session() as session:
                result = await session.fetchrow("""
                    SELECT id, title, processing_status, total_chunks, user_id 
                    FROM public.documents 
                    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
                """, document_id, user_id)
                
                if not result:
                    raise ValueError("Document not found or access denied")
                
                # Check if document is ready for chat
                if result['processing_status'] not in ['completed']:
                    raise ValueError(f"Document is not ready for chat. Current status: {result['processing_status']}")
                
                # if not result['total_chunks'] or result['total_chunks'] == 0:
                #     raise ValueError("Document has no processed content chunks available for chat")
                
                return dict(result)
                
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Document ownership validation failed: {str(e)}")
            raise ValueError("Failed to validate document ownership")
    
    async def validate_document_exists_and_ready(self, document_id: UUID) -> Dict[str, Any]:
        """
        Validate that a document exists and is ready for processing (without ownership check).
        
        Args:
            document_id: UUID of the document to check
            
        Returns:
            Dictionary with document metadata
            
        Raises:
            ValueError: If document doesn't exist or isn't ready
        """
        
        try:
            async with get_db_session() as session:
                result = await session.fetchrow("""
                    SELECT id, title, processing_status, total_chunks, user_id
                    FROM public.documents 
                    WHERE id = $1 AND deleted_at IS NULL
                """, document_id)
                
                if not result:
                    raise ValueError("Document not found")
                
                # Check if document is ready for chat
                if result['processing_status'] not in ['completed']:
                    raise ValueError(f"Document is not ready for chat. Current status: {result['processing_status']}")
                
                if not result['total_chunks'] or result['total_chunks'] == 0:
                    raise ValueError("Document has no processed content chunks available for chat")
                
                return dict(result)
                
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Document validation failed: {str(e)}")
            raise ValueError("Failed to validate document")


# Singleton instance for application use
document_service = DocumentService()