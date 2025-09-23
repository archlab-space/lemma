"""
Document API endpoints for the Lemma backend.
"""

from typing import Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse

from app.schemas.document import (
    DocumentCreate, 
    DocumentResponse, 
    DocumentUpdate,
    DocumentSummary
)
from app.services.document_service import DocumentService
from app.services.document_processor import document_processor
from app.models.document import ProcessingStatus
from app.core.dependencies import get_current_user_id, get_current_user_from_headers


router = APIRouter()


@router.post("/check-duplicate")
async def check_duplicate(
    request_data: Dict[str, str],
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Check if a document with the given file hash already exists."""
    file_hash = request_data.get("fileHash")
    if not file_hash:
        raise HTTPException(status_code=400, detail="fileHash is required")
    
    try:
        document_service = DocumentService()
        result = await document_service.check_duplicate(UUID(user_id), file_hash)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check duplicate: {str(e)}")


@router.post("/", response_model=Dict[str, Any])
async def create_document(
    document_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Create a new document metadata record."""
    try:
        # Extract and validate required fields
        required_fields = ['filename', 'originalFilename', 'fileSizeBytes', 'fileHash', 'mimeType', 'storagePath', 'fileId']
        missing_fields = [field for field in required_fields if field not in document_data]
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {missing_fields}"
            )
        
        # Validate file type
        if document_data['mimeType'] != 'application/pdf':
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are allowed"
            )
        
        # Create DocumentCreate schema instance
        create_data = DocumentCreate(
            filename=document_data['filename'],
            original_filename=document_data['originalFilename'],
            file_size_bytes=document_data['fileSizeBytes'],
            file_hash=document_data['fileHash'],
            storage_path=document_data['storagePath'],
            title=document_data.get('title'),
            authors=document_data.get('authors'),
            abstract=document_data.get('abstract'),
            doi=document_data.get('doi'),
            publication_year=document_data.get('publicationYear'),
            journal=document_data.get('journal'),
            keywords=document_data.get('keywords')
        )
        
        document_service = DocumentService()
        document = await document_service.create_document(
            user_id=UUID(user_id),
            document_data=create_data,
            file_id=document_data['fileId']  # Now required field
        )
        
        # Convert document to response format
        return {
            "document": {
                "id": str(document.id),
                "userId": str(document.user_id),
                "filename": document.filename,
                "originalFilename": document.original_filename,
                "fileSizeBytes": document.file_size_bytes,
                "fileHash": document.file_hash,
                "mimeType": document.mime_type,
                "storage_path": document.storage_path,
                "storageBucket": document.storage_bucket,
                "processingStatus": document.processing_status,
                "createdAt": document.created_at.isoformat() if document.created_at else None,
                "updatedAt": document.updated_at.isoformat() if document.updated_at else None,
                "title": document.title,
                "authors": document.authors,
                "abstract": document.abstract,
                "doi": document.doi,
                "publicationYear": document.publication_year,
                "journal": document.journal,
                "keywords": document.keywords,
                "totalPages": document.total_pages,
                "totalWords": document.total_words,
                "totalChunks": document.total_chunks,
                "outline": document.outline
            }
        }
        
    except ValueError as e:
        if "already exists" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create document: {str(e)}")


@router.get("/", response_model=Dict[str, Any])
async def get_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Get paginated list of user documents."""
    try:
        # Validate status if provided
        processing_status = None
        if status:
            try:
                processing_status = ProcessingStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        document_service = DocumentService()
        result = await document_service.get_user_documents(
            user_id=UUID(user_id),
            page=page,
            limit=limit,
            search=search,
            status=processing_status
        )
        
        # Convert documents to response format
        documents = []
        for doc in result['documents']:
            documents.append({
                "id": str(doc.id),
                "userId": str(doc.user_id),
                "filename": doc.filename,
                "originalFilename": doc.original_filename,
                "fileSizeBytes": doc.file_size_bytes,
                "fileHash": doc.file_hash,
                "mimeType": doc.mime_type,
                "storage_path": doc.storage_path,
                "storageBucket": doc.storage_bucket,
                "processingStatus": doc.processing_status,
                "createdAt": doc.created_at.isoformat() if doc.created_at else None,
                "updatedAt": doc.updated_at.isoformat() if doc.updated_at else None,
                "title": doc.title,
                "authors": doc.authors,
                "abstract": doc.abstract,
                "doi": doc.doi,
                "publicationYear": doc.publication_year,
                "journal": doc.journal,
                "keywords": doc.keywords,
                "totalPages": doc.total_pages,
                "totalWords": doc.total_words,
                "totalChunks": doc.total_chunks,
                "outline": doc.outline
            })
        
        return {
            "documents": documents,
            "pagination": {
                "total": result['total'],
                "page": result['page'],
                "limit": result['limit'],
                "totalPages": result['total_pages']
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")


@router.get("/{document_id}", response_model=Dict[str, Any])
async def get_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Get a specific document by ID."""
    try:
        document_service = DocumentService()
        document = await document_service.get_document_by_id(UUID(user_id), UUID(document_id))
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "id": str(document.id),
            "userId": str(document.user_id),
            "filename": document.filename,
            "originalFilename": document.original_filename,
            "fileSizeBytes": document.file_size_bytes,
            "fileHash": document.file_hash,
            "mimeType": document.mime_type,
            "storage_path": document.storage_path,
            "storageBucket": document.storage_bucket,
            "processingStatus": document.processing_status,
            "createdAt": document.created_at.isoformat() if document.created_at else None,
            "updatedAt": document.updated_at.isoformat() if document.updated_at else None,
            "title": document.title,
            "authors": document.authors,
            "abstract": document.abstract,
            "doi": document.doi,
            "publicationYear": document.publication_year,
            "journal": document.journal,
            "keywords": document.keywords,
            "totalPages": document.total_pages,
            "totalWords": document.total_words,
            "totalChunks": document.total_chunks,
            "outline": document.outline
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch document: {str(e)}")


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Delete a document (soft delete)."""
    try:
        document_service = DocumentService()
        success = await document_service.delete_document(UUID(user_id), UUID(document_id))
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "message": "Document deleted successfully",
            "documentId": document_id
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.patch("/{document_id}/status")
async def update_document_status(
    document_id: str,
    status_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Update document processing status."""
    try:
        status = status_data.get('processingStatus')
        error_message = status_data.get('processingError')
        
        if not status:
            raise HTTPException(status_code=400, detail="processingStatus is required")
        
        try:
            processing_status = ProcessingStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        document_service = DocumentService()
        document = await document_service.update_document_status(
            UUID(document_id),
            processing_status,
            error_message
        )
        
        # If status is being set to 'processing', trigger the actual processing
        if processing_status == ProcessingStatus.PROCESSING:
            await document_processor.trigger_processing(UUID(document_id))
            
        return {
            "id": str(document.id),
            "processingStatus": document.processing_status,
            "processingError": document.processing_error,
            "processingStartedAt": document.processing_started_at.isoformat() if document.processing_started_at else None,
            "processingCompletedAt": document.processing_completed_at.isoformat() if document.processing_completed_at else None,
            "updatedAt": document.updated_at.isoformat() if document.updated_at else None
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update document status: {str(e)}")


@router.post("/{document_id}/process")
async def trigger_document_processing(
    document_id: str,
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Manually trigger document processing."""
    try:
        document_service = DocumentService()
        document = await document_service.get_document_by_id(UUID(user_id), UUID(document_id))
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
            
        # Check if document is in a processable state
        if document.processing_status not in [ProcessingStatus.PENDING, ProcessingStatus.FAILED]:
            raise HTTPException(
                status_code=400, 
                detail=f"Document cannot be processed in current status: {document.processing_status}"
            )
        
        # Trigger processing
        await document_processor.trigger_processing(UUID(document_id))
        
        return {
            "message": "Document processing triggered",
            "documentId": document_id,
            "status": "processing"
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger processing: {str(e)}")