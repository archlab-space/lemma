"""
PDF Processing Service for Lemma
Main orchestrator for PDF parsing, text extraction, and metadata extraction for academic papers.
"""

import fitz  # PyMuPDF
import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
from uuid import UUID
import aioboto3
from botocore.config import Config

from app.core.logging import get_logger
from app.core.config import get_settings
from .pdf_models import ProcessingConfig, ProcessingError
from .pdf_content_extractor import PDFContentExtractor
from .pdf_chunking import PDFChunker
from .pdf_ai_enrichment import PDFAIEnricher

logger = get_logger(__name__)
settings = get_settings()


class PDFProcessor:
    """
    Advanced PDF processor for academic papers using PyMuPDF.
    
    Features:
    - Text extraction with layout preservation
    - Metadata extraction (title, authors, abstract, etc.)
    - Natural block-based chunking (1 PyMuPDF block = 1+ RAG chunks)
    - Table of contents extraction
    - Academic paper structure detection
    """
    
    def __init__(self, max_workers: Optional[int] = None):
        self.max_workers = max_workers or ProcessingConfig.MAX_WORKERS
        self.executor = ThreadPoolExecutor(max_workers=self.max_workers)
        self._closed = False

        # Initialize component modules
        self.content_extractor = PDFContentExtractor()
        self.chunker = PDFChunker()
        self.ai_enricher = PDFAIEnricher()

        # Initialize async boto3 session for R2
        self.session = aioboto3.Session(
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name='auto',
        )

        # R2 client config
        self.r2_config = Config(
            retries={'max_attempts': 3},
            s3={'addressing_style': 'path'}
        )
    
    @asynccontextmanager
    async def managed_processing(self):
        """Context manager for proper resource cleanup."""
        try:
            yield self
        finally:
            await self.cleanup()
    
    async def cleanup(self):
        """Explicitly cleanup resources."""
        if not self._closed and hasattr(self, 'executor'):
            self.executor.shutdown(wait=True)
            self._closed = True
            logger.debug("PDF processor resources cleaned up")

    async def validate_pdf_file(self, file_path: str) -> bool:
        """Validate that the file is a proper PDF with readable content."""
        return await self.content_extractor.validate_pdf_file(file_path)

    async def _upload_text_to_r2(self, text_content: str, storage_path: str) -> None:
        """Upload parsed text to R2 storage."""
        try:
            async with self.session.client( # type: ignore
                's3',
                endpoint_url=settings.R2_ENDPOINT,
                config=self.r2_config
            ) as s3_client:
                await s3_client.put_object(
                    Bucket=settings.R2_BUCKET_NAME,
                    Key=storage_path,
                    Body=text_content.encode('utf-8'),
                    ContentType='text/plain; charset=utf-8'
                )

            logger.info(f"Successfully uploaded parsed text to R2: {storage_path}")

        except Exception as e:
            logger.error(f"Failed to upload parsed text to R2: {storage_path} - {str(e)}")
            raise ProcessingError(f"Failed to upload parsed text: {str(e)}", storage_path) from e

    async def process_pdf(self, file_path: str, document_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """
        Main method to process a PDF file.
        Returns extracted text, metadata, block-based chunks, and outline.

        Args:
            file_path: Local path to the PDF file
            document_id: UUID of the document
            user_id: UUID of the user who owns the document
        """
        try:
            # Validate PDF file
            await self.validate_pdf_file(file_path)
            
            # Extract basic content
            result = await self._extract_pdf_content(file_path)

            # Create chunks from extracted content
            result["chunks"] = self.chunker.create_block_chunks(result["page_info"])

            # Store parsed text to R2
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y-%m-%d')
            parsed_text_path = f"documents/{user_id}/{timestamp}/{document_id}_parsed.txt"

            await self._upload_text_to_r2(result["full_text"], parsed_text_path)
            result["parsed_text_path"] = parsed_text_path

            # Apply AI enhancements
            await self.ai_enricher.apply_ai_enhancements(result, file_path)
            
            logger.info(f"Successfully processed PDF: {file_path}")
            return result
            
        except ProcessingError:
            raise
        except Exception as e:
            raise ProcessingError(f"Processing failed: {str(e)}", file_path) from e
    
    async def _extract_pdf_content(self, file_path: str) -> Dict[str, Any]:
        """Extract basic content from PDF file."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, 
            self._process_pdf_sync, 
            file_path
        )
    
    def _process_pdf_sync(self, file_path: str) -> Dict[str, Any]:
        """Synchronous PDF processing (runs in thread pool)."""
        doc = fitz.open(file_path)
        
        try:
            # Extract text with layout
            full_text, page_info = self.content_extractor.extract_text_with_layout(doc)
            
            # Extract metadata
            metadata = self.content_extractor.extract_metadata(doc, full_text)
            
            return {
                "full_text": full_text,
                "page_info": page_info,  # Include page information for chunking
                "pdf_metadata": doc.metadata or {},  # Include PDF metadata for LLM processing
                "metadata": {
                    "title": metadata.title,
                    "authors": metadata.authors or [],
                    "page_count": metadata.page_count,
                    "word_count": metadata.word_count
                }
            }
            
        finally:
            doc.close()

    def __del__(self):
        """Cleanup thread pool on deletion."""
        try:
            if hasattr(self, 'executor') and not self._closed:
                self.executor.shutdown(wait=False)  # Don't wait in destructor
        except Exception:
            pass  # Ignore cleanup errors in destructor