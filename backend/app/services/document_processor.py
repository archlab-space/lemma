"""
Document Processing Service
Handles the complete document processing pipeline from upload to ready-for-RAG.
"""

import asyncio
import os
from pathlib import Path
from typing import Optional, Dict, Any
from uuid import UUID
import tempfile
import httpx
from datetime import datetime

from app.services.pdf_processor import PDFProcessor
from app.services.document_service import DocumentService
from app.models.document import ProcessingStatus
from app.core.logging import get_logger
from app.core.config import get_settings

logger = get_logger(__name__)
settings = get_settings()


class DocumentProcessor:
    """
    High-level document processor that orchestrates the entire pipeline:
    1. Download PDF from R2 storage
    2. Process PDF to extract text, metadata, chunks
    3. Update database with extracted information
    4. Store chunks for RAG retrieval
    """
    
    def __init__(self):
        self.pdf_processor = PDFProcessor()
        self.document_service = DocumentService()
        
    async def download_file_from_r2(self, storage_path: str) -> str:
        """Download file from R2 storage to temporary location."""
        try:
            # Construct R2 URL
            r2_url = f"{settings.R2_ENDPOINT}/{settings.R2_BUCKET_NAME}/{storage_path}"
            
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(
                delete=False, 
                suffix='.pdf',
                prefix='lemma_processing_'
            )
            temp_path = temp_file.name
            temp_file.close()
            
            # Download file
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(r2_url)
                response.raise_for_status()
                
                # Write to temporary file
                with open(temp_path, 'wb') as f:
                    f.write(response.content)
            
            logger.info(f"Downloaded file from R2: {storage_path} -> {temp_path}")
            return temp_path
            
        except Exception as e:
            logger.error(f"Failed to download file from R2: {storage_path} - {str(e)}")
            raise

    async def process_document(self, document_id: UUID) -> Dict[str, Any]:
        """
        Process a document through the complete pipeline.
        
        Args:
            document_id: UUID of the document to process
            
        Returns:
            Dict containing processing results and statistics
        """
        processing_start = datetime.now()
        temp_file_path = None
        
        try:            
            # Get document metadata from database
            # Note: We need to modify document_service to get document by ID without user_id constraint for internal processing
            document = await self._get_document_for_processing(document_id)
            if not document:
                raise ValueError(f"Document not found: {document_id}")
            
            logger.info(f"Starting processing for document: {document_id}")
            
            # Download PDF from R2 storage
            temp_file_path = await self.download_file_from_r2(document.storage_path)
            
            # Process PDF
            processing_result = await self.pdf_processor.process_pdf(temp_file_path)
            
            # Extract processing results
            metadata = processing_result["metadata"]
            chunks = processing_result["chunks"]
            outline = processing_result.get("outline", [])
            enrichment = processing_result.get("enrichment", {})
            ai_enhancement_status = processing_result.get("ai_enhancement_status", {"success": False, "error": None})
            
            # Update document with extracted metadata
            await self._update_document_metadata(document_id, metadata, outline, enrichment, ai_enhancement_status)
            
            # Store chunks for RAG (this will be implemented in Phase 4.3)
            chunk_count = await self._store_document_chunks(document_id, chunks)
            
            # Calculate processing statistics
            processing_duration = (datetime.now() - processing_start).total_seconds()
            
            processing_stats = {
                "document_id": str(document_id),
                "processing_duration_seconds": processing_duration,
                "total_pages": metadata["page_count"],
                "total_words": metadata["word_count"],
                "total_sections": len(outline),
                "total_chunks": chunk_count,
                "extracted_metadata": {
                    "title": metadata.get("title"),
                    "authors_count": len(metadata.get("authors", [])),
                    "has_abstract": bool(metadata.get("abstract")),
                    "keywords_count": len(metadata.get("keywords", [])),
                    "has_doi": bool(metadata.get("doi")),
                    "publication_year": metadata.get("publication_year"),
                    "ai_enhanced": metadata.get("ai_enhanced", False),
                    "ai_enhancement_success": ai_enhancement_status.get("success", False)
                }
            }
            
            # Update status to completed
            await self.document_service.update_document_status(
                document_id, 
                ProcessingStatus.COMPLETED
            )
            
            logger.info(f"Successfully processed document {document_id} in {processing_duration:.2f}s")
            return processing_stats
            
        except Exception as e:
            # Update status to failed
            error_message = f"Processing failed: {str(e)}"
            await self.document_service.update_document_status(
                document_id, 
                ProcessingStatus.FAILED,
                error_message
            )
            
            logger.error(f"Document processing failed for {document_id}: {str(e)}")
            raise
            
        finally:
            # Cleanup temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                    logger.debug(f"Cleaned up temporary file: {temp_file_path}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup temporary file {temp_file_path}: {str(e)}")

    async def _get_document_for_processing(self, document_id: UUID):
        """Get document for internal processing (bypasses user constraints)."""
        # For now, we'll need to add a method to document_service for internal access
        # This is a placeholder - we'll implement this properly
        try:
            from app.db.session import get_db_session
            
            async with get_db_session() as session:
                result = await session.fetch("""
                    SELECT * FROM public.documents 
                    WHERE id = $1 AND deleted_at IS NULL
                """, document_id)
                
                if result:
                    from app.models.document import Document
                    return Document(**dict(result[0]))
                return None
                
        except Exception as e:
            logger.error(f"Failed to get document for processing: {str(e)}")
            return None

    async def _update_document_metadata(self, document_id: UUID, metadata: Dict[str, Any], outline: list, enrichment: Dict[str, Any], ai_enhancement_status: Dict[str, Any]):
        """Update document in database with extracted metadata."""
        try:
            from app.db.session import get_db_session
            
            async with get_db_session() as session:
                await session.execute("""
                    UPDATE public.documents 
                    SET 
                        title = $2,
                        authors = $3,
                        abstract = $4,
                        keywords = $5,
                        doi = $6,
                        publication_year = $7,
                        journal = $8,
                        language = $9,
                        total_pages = $10,
                        total_words = $11,
                        outline = $12,
                        enrichment = $13,
                        ai_enhancement_status = $14,
                        updated_at = $15
                    WHERE id = $1
                """, 
                document_id,
                metadata.get("title"),
                metadata.get("authors", []),
                metadata.get("abstract"),
                metadata.get("keywords", []),
                metadata.get("doi"),
                metadata.get("publication_year"),
                metadata.get("journal"),
                metadata.get("language", "en"),
                metadata.get("page_count", 0),
                metadata.get("word_count", 0),
                outline,
                enrichment,
                ai_enhancement_status,
                datetime.now()
                )
                
            logger.info(f"Updated document metadata for {document_id}")
            
        except Exception as e:
            logger.error(f"Failed to update document metadata: {str(e)}")
            raise

    async def _store_document_chunks(self, document_id: UUID, chunks: list) -> int:
        """
        Store document chunks for RAG retrieval.
        This is a placeholder for Phase 4.3 (Embeddings & Vector Storage).
        """
        try:
            # For now, we'll just log the chunks and return count
            # In Phase 4.3, we'll implement actual embedding generation and storage
            
            logger.info(f"Storing {len(chunks)} chunks for document {document_id}")
            
            # TODO: Implement in Phase 4.3
            # - Generate embeddings for each chunk
            # - Store chunks with embeddings in document_chunks table
            # - Update document.total_chunks field
            
            # Placeholder: Update total_chunks in document
            from app.db.session import get_db_session
            
            async with get_db_session() as session:
                await session.execute("""
                    UPDATE public.documents 
                    SET total_chunks = $2, updated_at = $3
                    WHERE id = $1
                """, document_id, len(chunks), datetime.now())
            
            return len(chunks)
            
        except Exception as e:
            logger.error(f"Failed to store document chunks: {str(e)}")
            raise

    async def process_document_async(self, document_id: UUID):
        """
        Process document asynchronously (fire-and-forget).
        This method is called after successful file upload.
        """
        try:
            await self.process_document(document_id)
        except Exception as e:
            # Error is already logged in process_document
            pass

    async def trigger_processing(self, document_id: UUID):
        """
        Trigger document processing asynchronously.
        Returns immediately while processing happens in background.
        """
        # Create background task
        asyncio.create_task(self.process_document_async(document_id))
        logger.info(f"Triggered background processing for document: {document_id}")


# Global processor instance
document_processor = DocumentProcessor()