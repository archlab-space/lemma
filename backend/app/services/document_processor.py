"""
Document Processing Service
Handles the complete document processing pipeline from upload to ready-for-RAG.
"""

import asyncio
import os
from pathlib import Path
from typing import Optional, Dict, Any, TYPE_CHECKING, cast
from uuid import UUID
import tempfile
import httpx
import aioboto3
from botocore.config import Config
from botocore.exceptions import ClientError, NoCredentialsError
from datetime import datetime

if TYPE_CHECKING:
    from typing import Any

from app.services.pdf_processor import PDFProcessor
from app.services.document_service import DocumentService
from app.services.chunk_processor import chunk_processor
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
        
        # Initialize async boto3 session for R2
        self.session = aioboto3.Session(
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name='auto',  # R2 uses 'auto' region
        )
        
        # R2 client config
        self.r2_config = Config(
            retries={'max_attempts': 3},
            s3={'addressing_style': 'path'}  # Use path-style URLs for R2
        )
    
    async def _check_file_exists(self, storage_path: str) -> bool:
        """Check if file exists in R2 storage."""
        try:
            async with self.session.client( # type: ignore
                's3',
                endpoint_url=settings.R2_ENDPOINT,
                config=self.r2_config
            ) as s3_client:
                await s3_client.head_object(
                    Bucket=settings.R2_BUCKET_NAME,
                    Key=storage_path
                )
                return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == 'NoSuchKey':
                logger.error(f"File not found in R2: {storage_path}")
                return False
            else:
                logger.error(f"Error checking file existence: {error_code}")
                return False
        except Exception as e:
            logger.error(f"Unexpected error checking file existence: {str(e)}")
            return False
            
    async def download_file_from_r2(self, storage_path: str) -> str:
        """Download file from R2 storage to temporary location using aioboto3."""
        temp_path = None
        try:
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(
                delete=False, 
                suffix='.pdf',
                prefix='lemma_processing_'
            )
            temp_path = temp_file.name
            temp_file.close()
            
            logger.info(f"Downloading file from R2: bucket={settings.R2_BUCKET_NAME}, key={storage_path}")
            
            # Check if file exists first
            if not await self._check_file_exists(storage_path):
                raise ValueError(f"File not found in R2 storage: {storage_path}")
            
            # Download file using aioboto3
            async with self.session.client( # type: ignore
                's3',
                endpoint_url=settings.R2_ENDPOINT,
                config=self.r2_config
            ) as s3_client:
                # Download file directly using aioboto3
                await s3_client.download_file(
                    settings.R2_BUCKET_NAME,
                    storage_path,
                    temp_path
                )
            
            # Verify file was downloaded
            if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
                raise ValueError(f"Downloaded file is empty or doesn't exist: {temp_path}")
            
            logger.info(f"Successfully downloaded file from R2 via aioboto3: {storage_path} -> {temp_path} ({os.path.getsize(temp_path)} bytes)")
            return temp_path
                
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"R2 Client Error downloading {storage_path}: {error_code} - {error_message}")
            
            # Clean up temp file on error
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
                
            raise ValueError(f"Failed to download from R2: {error_code} - {error_message}")
            
        except NoCredentialsError:
            logger.error("R2 credentials not found or invalid")
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
            raise ValueError("R2 credentials not configured properly")
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error downloading from R2: {storage_path} - {str(e)}")
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
            raise ValueError(f"HTTP download failed: {str(e)}")
            
        except Exception as e:
            logger.error(f"Unexpected error downloading file from R2: {storage_path} - {str(e)}")
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
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
            
            # Process chunks through embedding pipeline
            chunk_processing_result = await chunk_processor.process_document_chunks(document_id, document.user_id, chunks)
            chunk_count = chunk_processing_result.get('stored_chunks', 0)
            embedding_status = chunk_processing_result.get('embedding_status', {})
            
            # Update document with extracted metadata
            await self._update_document_metadata(document_id, metadata, outline, enrichment, ai_enhancement_status, embedding_status, chunk_count)
            
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
                },
                "chunk_processing": {
                    "status": chunk_processing_result.get("status"),
                    "success_rate": chunk_processing_result.get("success_rate", 0),
                    "embedding_statistics": chunk_processing_result.get("statistics", {}).get("embedding_statistics", {})
                },
                "embedding_processing": {
                    "status": embedding_status.get("status"),
                    "embedded_chunks": embedding_status.get("embedded_chunks", 0),
                    "failed_chunks": embedding_status.get("failed_chunks", 0),
                    "model_name": embedding_status.get("model_name"),
                    "processing_duration": embedding_status.get("processing_duration_seconds", 0)
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

    async def _update_document_metadata(self, document_id: UUID, metadata: Dict[str, Any], outline: list, enrichment: Dict[str, Any], ai_enhancement_status: Dict[str, Any], embedding_status: Dict[str, Any], chunk_count: int):
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
                        total_chunks = $12,
                        outline = $13,
                        enrichment = $14,
                        ai_enhancement_status = $15,
                        embedding_status = $16
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
                chunk_count,
                outline,
                enrichment,
                ai_enhancement_status,
                embedding_status,
                )
                
            logger.info(f"Updated document metadata for {document_id}")
            
        except Exception as e:
            logger.error(f"Failed to update document metadata: {str(e)}")
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