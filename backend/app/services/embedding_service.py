"""
Embedding Service for Lemma
Handles text embedding generation using sentence-transformers.
"""

import asyncio
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.logging import get_logger
from app.core.config import get_settings

logger = get_logger(__name__)
settings = get_settings()


class EmbeddingConfig:
    """Configuration for embedding generation."""
    DEFAULT_MODEL = getattr(settings, 'EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
    MAX_WORKERS = getattr(settings, 'EMBEDDING_MAX_WORKERS', 2)
    BATCH_SIZE = getattr(settings, 'EMBEDDING_BATCH_SIZE', 32)
    MAX_SEQ_LENGTH = getattr(settings, 'EMBEDDING_MAX_SEQ_LENGTH', 512)
    VECTOR_DIMENSION = 384  # for all-MiniLM-L6-v2


class EmbeddingError(Exception):
    """Exception for embedding-related errors."""
    pass


class EmbeddingService:
    """
    Service for generating text embeddings using sentence-transformers.
    
    Features:
    - Async embedding generation with thread pool
    - Batch processing for efficiency
    - Model version tracking
    - Caching and deduplication
    """
    
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or EmbeddingConfig.DEFAULT_MODEL
        self.vector_dimension = EmbeddingConfig.VECTOR_DIMENSION
        self.executor = ThreadPoolExecutor(max_workers=EmbeddingConfig.MAX_WORKERS)
        self._model: Optional[SentenceTransformer] = None
        self._model_version: Optional[str] = None
        
    async def initialize(self):
        """Initialize the embedding model asynchronously."""
        if self._model is None:
            logger.info(f"Loading embedding model: {self.model_name}")
            loop = asyncio.get_event_loop()
            self._model = await loop.run_in_executor(
                self.executor, 
                self._load_model
            )
            self._model_version = self._get_model_version()
            logger.info(f"Embedding model loaded successfully. Version: {self._model_version}")
    
    def _load_model(self) -> SentenceTransformer:
        """Load the sentence transformer model (runs in thread pool)."""
        try:
            model = SentenceTransformer(self.model_name)
            # Set max sequence length if specified
            if hasattr(model, 'max_seq_length'):
                model.max_seq_length = EmbeddingConfig.MAX_SEQ_LENGTH
            return model
        except Exception as e:
            raise EmbeddingError(f"Failed to load embedding model {self.model_name}: {str(e)}") from e
    
    def _get_model_version(self) -> str:
        """Generate a version hash for the current model."""
        # Create a hash based on model name and key parameters
        version_string = f"{self.model_name}_{EmbeddingConfig.MAX_SEQ_LENGTH}_{EmbeddingConfig.VECTOR_DIMENSION}"
        return hashlib.md5(version_string.encode()).hexdigest()[:8]
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not text or not text.strip():
            raise EmbeddingError("Cannot generate embedding for empty text")
        
        embeddings = await self.generate_embeddings([text])
        return embeddings[0]
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        if not texts:
            return []
        
        # Filter out empty texts
        valid_texts = [text.strip() for text in texts if text and text.strip()]
        if not valid_texts:
            raise EmbeddingError("No valid texts provided for embedding generation")
        
        await self.initialize()
        
        # Process in batches for memory efficiency
        all_embeddings = []
        batch_size = EmbeddingConfig.BATCH_SIZE
        
        for i in range(0, len(valid_texts), batch_size):
            batch = valid_texts[i:i + batch_size]
            logger.debug(f"Processing embedding batch {i//batch_size + 1}/{(len(valid_texts) + batch_size - 1)//batch_size}")
            
            batch_embeddings = await self._generate_batch_embeddings(batch)
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
    
    async def _generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a batch of texts."""
        loop = asyncio.get_event_loop()
        
        try:
            embeddings = await loop.run_in_executor(
                self.executor,
                self._encode_batch,
                texts
            )
            
            # Convert to list of lists for JSON serialization
            return [embedding.tolist() for embedding in embeddings]
            
        except Exception as e:
            raise EmbeddingError(f"Failed to generate embeddings: {str(e)}") from e
    
    def _encode_batch(self, texts: List[str]) -> np.ndarray:
        """Encode batch of texts using the model (runs in thread pool)."""
        if self._model is None:
            raise EmbeddingError("Model not initialized")
        
        try:
            embeddings = self._model.encode(
                texts,
                convert_to_numpy=True,
                normalize_embeddings=True,  # Normalize for cosine similarity
                show_progress_bar=False
            )
            return embeddings
        except Exception as e:
            raise EmbeddingError(f"Model encoding failed: {str(e)}") from e
    
    async def generate_chunk_embeddings(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate embeddings for document chunks.
        
        Args:
            chunks: List of chunk dictionaries with 'content' field
            
        Returns:
            List of chunks with added 'embedding' field
        """
        if not chunks:
            return []
        
        # Extract text content from chunks
        texts = []
        valid_chunk_indices = []
        
        for i, chunk in enumerate(chunks):
            content = chunk.get('content', '').strip()
            if content:
                texts.append(content)
                valid_chunk_indices.append(i)
        
        if not texts:
            logger.warning("No valid content found in chunks for embedding generation")
            return chunks
        
        logger.info(f"Generating embeddings for {len(texts)} chunks")
        
        # Generate embeddings
        embeddings = await self.generate_embeddings(texts)
        
        # Add embeddings back to chunks
        enriched_chunks = chunks.copy()
        for i, embedding in enumerate(embeddings):
            chunk_index = valid_chunk_indices[i]
            enriched_chunks[chunk_index]['embedding'] = embedding
            enriched_chunks[chunk_index]['embedding_model'] = self.model_name
            enriched_chunks[chunk_index]['embedding_version'] = self._model_version
            enriched_chunks[chunk_index]['vector_dimension'] = len(embedding)
        
        logger.info(f"Successfully generated embeddings for {len(embeddings)} chunks")
        return enriched_chunks
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current embedding model."""
        return {
            "model_name": self.model_name,
            "model_version": self._model_version,
            "vector_dimension": self.vector_dimension,
            "max_seq_length": EmbeddingConfig.MAX_SEQ_LENGTH,
            "is_initialized": self._model is not None
        }
    
    async def cleanup(self):
        """Cleanup resources."""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=True)
            logger.debug("Embedding service resources cleaned up")


# Singleton instance for application use
embedding_service = EmbeddingService()