"""
Embedding Service for Lemma
Handles text embedding generation using LiteLLM with OpenAI embeddings.
"""

import asyncio
import hashlib
from typing import List, Dict, Any, Optional
import litellm

from app.core.logging import get_logger
from app.core.config import get_settings

logger = get_logger(__name__)
settings = get_settings()


class EmbeddingConfig:
    """Configuration for embedding generation."""
    # text-embedding-3-small
    DEFAULT_MODEL = getattr(settings, 'EMBEDDING_MODEL', 'gemini/gemini-embedding-001')
    BATCH_SIZE = getattr(settings, 'EMBEDDING_BATCH_SIZE', 100)  # OpenAI allows larger batches
    VECTOR_DIMENSION = 1536  # for text-embedding-3-small
    MAX_RETRIES = getattr(settings, 'EMBEDDING_MAX_RETRIES', 3)


class EmbeddingError(Exception):
    """Exception for embedding-related errors."""
    pass


class EmbeddingService:
    """
    Service for generating text embeddings using LiteLLM with OpenAI.
    
    Features:
    - Async embedding generation with LiteLLM
    - Batch processing for efficiency
    - Model version tracking
    - Error handling and retries
    """
    
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or EmbeddingConfig.DEFAULT_MODEL
        self.vector_dimension = EmbeddingConfig.VECTOR_DIMENSION
        self._model_version: Optional[str] = None
        self._api_key: Optional[str] = None
        
    async def initialize(self):
        """Initialize the embedding service."""
        if self._api_key is None:
            self._api_key = getattr(settings, 'GEMINI_API_KEY', None)
            if not self._api_key:
                raise EmbeddingError("GEMINI_API_KEY not configured")
            
            self._model_version = self._get_model_version()
            logger.info(f"Embedding service initialized with model: {self.model_name}")
    
    def _get_model_version(self) -> str:
        """Generate a version hash for the current model."""
        version_string = f"{self.model_name}_{EmbeddingConfig.VECTOR_DIMENSION}"
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
        
        # Process in batches for API efficiency
        all_embeddings = []
        batch_size = EmbeddingConfig.BATCH_SIZE
        
        for i in range(0, len(valid_texts), batch_size):
            batch = valid_texts[i:i + batch_size]
            logger.debug(f"Processing embedding batch {i//batch_size + 1}/{(len(valid_texts) + batch_size - 1)//batch_size}")
            
            batch_embeddings = await self._generate_batch_embeddings(batch)
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
    
    async def _generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a batch of texts using LiteLLM."""
        retries = 0
        last_error = None
        
        while retries < EmbeddingConfig.MAX_RETRIES:
            try:
                response = await litellm.aembedding(
                    model=self.model_name,
                    input=texts,
                    api_key=self._api_key
                )
                
                # Extract embeddings from response
                embeddings = []
                for data_item in response.data:
                    embeddings.append(data_item.embedding)
                
                return embeddings
                
            except Exception as e:
                retries += 1
                last_error = e
                logger.warning(f"Embedding attempt {retries} failed: {str(e)}")
                
                if retries < EmbeddingConfig.MAX_RETRIES:
                    # Exponential backoff
                    wait_time = 2 ** retries
                    await asyncio.sleep(wait_time)
                    logger.debug(f"Retrying in {wait_time} seconds...")
        
        raise EmbeddingError(f"Failed to generate embeddings after {EmbeddingConfig.MAX_RETRIES} retries: {str(last_error)}") from last_error
    
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
            "is_initialized": self._api_key is not None
        }
    
    async def cleanup(self):
        """Cleanup resources."""
        logger.debug("Embedding service resources cleaned up")


# Singleton instance for application use
embedding_service = EmbeddingService()