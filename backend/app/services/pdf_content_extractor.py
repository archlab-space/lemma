"""
PDF Content Extraction for Lemma
Handles PDF validation, text extraction, and metadata extraction.
"""

import fitz  # PyMuPDF
import magic
from typing import List, Dict, Any, Tuple
from pathlib import Path

from app.core.logging import get_logger
from .pdf_models import ProcessingConfig, ProcessingError, DocumentMetadata

logger = get_logger(__name__)


class PDFContentExtractor:
    """Handles PDF content extraction and validation."""
    
    async def validate_pdf_file(self, file_path: str) -> bool:
        """Validate that the file is a proper PDF with readable content."""
        try:
            # Check file exists
            if not Path(file_path).exists():
                raise ProcessingError("File does not exist", file_path)
            
            file_size = Path(file_path).stat().st_size
            if file_size == 0:
                raise ProcessingError("File is empty", file_path, {"size": file_size})
            
            # Check MIME type
            mime_type = magic.from_file(file_path, mime=True)
            if mime_type != 'application/pdf':
                raise ProcessingError("Invalid file type", file_path, {"mime_type": mime_type})
            
            # Comprehensive PDF validation
            return await self._validate_pdf_content(file_path)
            
        except ProcessingError:
            raise
        except Exception as e:
            raise ProcessingError(f"Validation failed: {str(e)}", file_path) from e
    
    async def _validate_pdf_content(self, file_path: str) -> bool:
        """Validate PDF content readability and structure."""
        doc = None
        try:
            # Try to open with PyMuPDF
            doc = fitz.open(file_path)
            
            if doc.page_count == 0:
                raise ProcessingError("PDF has no pages", file_path)
            
            # Check if PDF is encrypted
            if doc.needs_pass:
                raise ProcessingError("PDF is password protected", file_path)
            
            # Test content extraction on first page
            if doc.page_count > 0:
                first_page = doc[0]
                test_text = first_page.get_text().strip() # type: ignore
                
                # Check if we can extract meaningful text
                if len(test_text) < 10:
                    raise ProcessingError("PDF appears to contain no readable text", file_path, 
                                        {"extracted_chars": len(test_text)})
                
                # Check for common PDF issues
                if test_text.count('�') > len(test_text) * 0.1:  # Too many replacement characters
                    raise ProcessingError("PDF contains corrupted text encoding", file_path)
            
            logger.info(f"PDF validation successful: {file_path} ({doc.page_count} pages)")
            return True
            
        finally:
            if doc:
                doc.close()

    def extract_text_with_layout(self, doc: fitz.Document) -> Tuple[str, List[Dict]]:
        """
        Extract text while preserving layout information with batch processing.
        Returns full text and page-level information.
        """
        full_text = ""
        page_info = []
        batch_size = ProcessingConfig.BATCH_SIZE
        
        # Process pages in batches to manage memory
        for batch_start in range(0, len(doc), batch_size):
            batch_end = min(batch_start + batch_size, len(doc))
            batch_text, batch_pages = self._process_page_batch(doc, batch_start, batch_end)
            
            full_text += batch_text
            page_info.extend(batch_pages)
            
            # Log progress for large documents
            if len(doc) > 20:
                logger.debug(f"Processed pages {batch_start + 1}-{batch_end} of {len(doc)}")
        
        return full_text.strip(), page_info
    
    def _process_page_batch(self, doc: fitz.Document, start_page: int, end_page: int) -> Tuple[str, List[Dict]]:
        """Process a batch of pages for memory efficiency."""
        batch_text = ""
        batch_pages = []
        
        for page_num in range(start_page, end_page):
            try:
                page = doc[page_num]
                page_data = self._extract_page_content(page, page_num + 1)
                
                batch_text += page_data["text"] + "\n\n"
                batch_pages.append(page_data)
                
            except Exception as e:
                logger.warning(f"Failed to process page {page_num + 1}: {str(e)}")
                # Continue with other pages
                continue
        
        return batch_text, batch_pages
    
    def _extract_page_content(self, page: fitz.Page, page_number: int) -> Dict:
        """Extract content from a single page."""
        # Extract text with layout info
        text_dict = page.get_text("dict")  # type: ignore
        page_text = ""
        
        # Process blocks (paragraphs/columns)
        blocks = []
        for block in text_dict["blocks"]:
            if "lines" in block:  # Text block
                block_text = ""
                for line in block["lines"]:
                    line_text = ""
                    for span in line["spans"]:
                        line_text += span["text"]
                    block_text += line_text + "\n"
                
                if block_text.strip():
                    blocks.append({
                        "text": block_text.strip(),
                        "bbox": block["bbox"],
                        "type": "text"
                    })
                    page_text += block_text + "\n"
        
        return {
            "page_number": page_number,
            "text": page_text.strip(),
            "blocks": blocks,
            "width": page.rect.width,
            "height": page.rect.height
        }

    def extract_metadata(self, doc: fitz.Document, full_text: str) -> DocumentMetadata:
        """Extract document metadata - will be enhanced with LLM in async processing."""
        # For now, just return basic metadata that will be enhanced later
        pdf_metadata = doc.metadata or {}
        
        # Add basic PDF info for LLM processing
        pdf_metadata['page_count'] = doc.page_count
        
        # Return basic metadata that will be enhanced by LLM
        author = pdf_metadata.get('author')
        metadata = DocumentMetadata(
            page_count=doc.page_count,
            word_count=len(full_text.split()),
            title=pdf_metadata.get('title'),
            authors=[author] if author and isinstance(author, str) else [],
        )
        
        return metadata