"""
PDF Chunking Logic for Lemma
Handles block-based chunking with intelligent splitting.
"""

import re
from typing import List, Dict, Optional

from app.core.logging import get_logger
from .pdf_models import ProcessingConfig

logger = get_logger(__name__)


def sanitize_text(text: str) -> str:
    """Remove null bytes and other problematic characters for PostgreSQL."""
    return text.replace('\x00', '')


class PDFChunker:
    """Handles PDF chunking with block-based approach."""
    
    def create_block_chunks(
        self, 
        page_info: List[Dict], 
        max_chunk_words: Optional[int] = None, 
        overlap_words: Optional[int] = None
    ) -> List[Dict]:
        """Create chunks from PyMuPDF blocks - one block = one or more chunks."""
        # Ensure we have concrete values, not None
        max_chunk_words_val: int = max_chunk_words if max_chunk_words is not None else ProcessingConfig.MAX_CHUNK_WORDS
        overlap_words_val: int = overlap_words if overlap_words is not None else ProcessingConfig.OVERLAP_WORDS
        
        chunks = []
        chunk_index = 0
        
        for page_data in page_info:
            page_number = page_data.get("page_number", 1)
            blocks = page_data.get("blocks", [])
            
            for block in blocks:
                if block.get("type") == "text" and block.get("text", "").strip():
                    block_text = sanitize_text(block["text"].strip())
                    block_words = block_text.split()
                    word_count = len(block_words)
                    
                    if word_count <= max_chunk_words_val:
                        # Block fits in single chunk - keep it whole
                        chunks.append({
                            "content": block_text,
                            "chunk_index": chunk_index,
                            "word_count": word_count,
                            "char_count": len(block_text),
                            "page_number": page_number,
                            "bbox": block.get("bbox"),
                            "chunk_type": "single_block",
                            "block_id": f"page_{page_number}_block_{len(chunks)}"
                        })
                        chunk_index += 1
                    else:
                        # Block too long - split it with overlap
                        block_chunks = self._split_large_block(
                            block_text, block_words, page_number, 
                            block.get("bbox"), max_chunk_words_val, overlap_words_val, chunk_index
                        )
                        chunks.extend(block_chunks)
                        chunk_index += len(block_chunks)
        
        return chunks
    
    def _split_large_block(
        self, 
        block_text: str, 
        block_words: List[str], 
        page_number: int, 
        bbox, 
        max_words: int, 
        overlap_words: int, 
        start_chunk_index: int
    ) -> List[Dict]:
        """Split a large block into multiple chunks at sentence boundaries."""
        # Split into sentences using regex (handles multiple sentence endings)
        sentence_pattern = r'(?<=[.!?])\s+'
        sentences = re.split(sentence_pattern, block_text.strip())
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return []
        
        chunks = []
        current_chunk_sentences = []
        current_word_count = 0
        chunk_within_block = 0
        
        for sentence in sentences:
            sentence_words = sentence.split()
            sentence_word_count = len(sentence_words)
            
            # If adding this sentence would exceed max_words and we have content
            if current_word_count > 0 and current_word_count + sentence_word_count > max_words:
                # Finalize current chunk
                chunk_text = ' '.join(str(sentence) for sentence in current_chunk_sentences)
                chunks.append({
                    "content": chunk_text,
                    "chunk_index": start_chunk_index + chunk_within_block,
                    "word_count": current_word_count,
                    "char_count": len(chunk_text),
                    "page_number": page_number,
                    "bbox": bbox,
                    "chunk_type": "split_block",
                    "block_id": f"page_{page_number}_block_split_{chunk_within_block}",
                    "part_of_block": True,
                    "block_part": f"{chunk_within_block + 1}",
                    "sentence_count": len(current_chunk_sentences)
                })
                
                chunk_within_block += 1
                
                # Start new chunk with overlap sentences
                overlap_sentences = self._get_overlap_sentences(
                    current_chunk_sentences, overlap_words
                )
                current_chunk_sentences = overlap_sentences + [sentence]
                current_word_count = sum(len(s.split()) for s in current_chunk_sentences)
            else:
                # Add sentence to current chunk
                current_chunk_sentences.append(sentence)
                current_word_count += sentence_word_count
        
        # Finalize last chunk if there are remaining sentences
        if current_chunk_sentences:
            chunk_text = ' '.join(current_chunk_sentences)
            chunks.append({
                "content": chunk_text,
                "chunk_index": start_chunk_index + chunk_within_block,
                "word_count": current_word_count,
                "char_count": len(chunk_text),
                "page_number": page_number,
                "bbox": bbox,
                "chunk_type": "split_block",
                "block_id": f"page_{page_number}_block_split_{chunk_within_block}",
                "part_of_block": True,
                "block_part": f"{chunk_within_block + 1}",
                "sentence_count": len(current_chunk_sentences)
            })
        
        return chunks
    
    def _get_overlap_sentences(self, sentences: List[str], target_overlap_words: int) -> List[str]:
        """Get the last few sentences for overlap, up to target word count."""
        if not sentences or target_overlap_words <= 0:
            return []
        
        overlap_sentences = []
        word_count = 0
        
        # Take sentences from the end until we reach target overlap
        for sentence in reversed(sentences):
            sentence_word_count = len(sentence.split())
            if word_count + sentence_word_count <= target_overlap_words:
                overlap_sentences.insert(0, sentence)  # Insert at beginning to maintain order
                word_count += sentence_word_count
            else:
                break
        
        return overlap_sentences