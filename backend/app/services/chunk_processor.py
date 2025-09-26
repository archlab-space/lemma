"""
Chunk Processor for Lemma
Bridges PDF processing and embedding generation, handling the complete pipeline
from raw text chunks to stored vector embeddings.
"""

import asyncio
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime

from app.core.logging import get_logger
from .embedding_service import embedding_service, EmbeddingError
from .vector_storage import vector_storage, VectorStorageError

logger = get_logger(__name__)


class ChunkProcessingError(Exception):
    """Exception for chunk processing related errors."""
    pass


class ChunkProcessor:
    """
    Processes document chunks through the embedding and storage pipeline.
    
    Features:
    - Generate embeddings for document chunks
    - Store chunks with embeddings in vector database
    - Handle processing errors gracefully
    - Provide detailed processing statistics
    """
    
    def __init__(self):
        self.embedding_service = embedding_service
        self.vector_storage = vector_storage
    
    def _create_embedding_status(
        self, 
        status: str, 
        total_chunks: int = 0,
        embedded_chunks: int = 0,
        failed_chunks: int = 0,
        error: Optional[str] = None,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Create standardized embedding status object."""
        model_info = self.embedding_service.get_model_info()
        
        embedding_status = {
            "status": status,
            "model_name": model_info.get("model_name"),
            "model_version": model_info.get("model_version"),
            "total_chunks": total_chunks,
            "embedded_chunks": embedded_chunks,
            "failed_chunks": failed_chunks,
            "success_rate": round(embedded_chunks / total_chunks, 3) if total_chunks > 0 else 0.0,
            "last_updated": datetime.now().isoformat()
        }
        
        if error:
            embedding_status["error"] = error
        
        if started_at:
            embedding_status["embedding_started_at"] = started_at.isoformat()
        
        if completed_at:
            embedding_status["embedding_completed_at"] = completed_at.isoformat()
            if started_at:
                duration = (completed_at - started_at).total_seconds()
                embedding_status["processing_duration_seconds"] = round(duration, 2)
        
        return embedding_status
    
    async def process_document_chunks(
        self, 
        document_id: UUID, 
        user_id: UUID,
        chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Process document chunks through the complete embedding pipeline.
        
        Args:
            document_id: UUID of the document
            chunks: List of text chunks from PDF processing
            
        Returns:
            Dictionary with processing results and statistics
        """
        if not chunks:
            logger.warning(f"No chunks provided for document {document_id}")
            return self._create_processing_result(0, 0, 0, "No chunks to process")
        
        logger.info(f"Processing {len(chunks)} chunks for document {document_id}")
        
        # Track embedding timing
        embedding_started_at = datetime.now()
        
        try:
            # Step 1: Generate embeddings for chunks
            chunks_with_embeddings = await self._generate_chunk_embeddings(chunks)
            
            # Step 2: Store chunks with embeddings in vector database
            stored_count = await self._store_chunks_with_embeddings(document_id, user_id, chunks_with_embeddings)
            
            # Step 3: Get processing statistics
            stats = await self._get_processing_statistics(document_id, chunks, chunks_with_embeddings)
            
            embedding_completed_at = datetime.now()
            
            # Count successful embeddings
            embedded_chunks = len([c for c in chunks_with_embeddings if 'embedding' in c])
            failed_chunks = len(chunks) - embedded_chunks
            
            # Create embedding status
            embedding_status = self._create_embedding_status(
                status="completed" if failed_chunks == 0 else "partial",
                total_chunks=len(chunks),
                embedded_chunks=embedded_chunks,
                failed_chunks=failed_chunks,
                started_at=embedding_started_at,
                completed_at=embedding_completed_at
            )
            
            logger.info(f"Successfully processed {stored_count} chunks for document {document_id}")
            
            result = self._create_processing_result(
                total_chunks=len(chunks),
                processed_chunks=len(chunks_with_embeddings),
                stored_chunks=stored_count,
                status="success",
                statistics=stats
            )
            result["embedding_status"] = embedding_status
            return result
            
        except Exception as e:
            embedding_failed_at = datetime.now()
            logger.error(f"Chunk processing failed for document {document_id}: {str(e)}")
            
            # Create failed embedding status
            embedding_status = self._create_embedding_status(
                status="failed",
                total_chunks=len(chunks),
                embedded_chunks=0,
                failed_chunks=len(chunks),
                error=str(e),
                started_at=embedding_started_at,
                completed_at=embedding_failed_at
            )
            
            result = self._create_processing_result(
                total_chunks=len(chunks),
                processed_chunks=0,
                stored_chunks=0,
                status="failed",
                error=str(e)
            )
            result["embedding_status"] = embedding_status
            return result
    
    async def _generate_chunk_embeddings(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate embeddings for document chunks."""
        try:
            logger.debug("Generating embeddings for document chunks")
            chunks_with_embeddings = await self.embedding_service.generate_chunk_embeddings(chunks)
            
            # Count successful embeddings
            successful_embeddings = sum(1 for chunk in chunks_with_embeddings if 'embedding' in chunk)
            logger.info(f"Generated embeddings for {successful_embeddings}/{len(chunks)} chunks")
            
            return chunks_with_embeddings
            
        except EmbeddingError as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            raise ChunkProcessingError(f"Failed to generate embeddings: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error during embedding generation: {str(e)}")
            raise ChunkProcessingError(f"Embedding generation error: {str(e)}") from e
    
    async def _store_chunks_with_embeddings(
        self, 
        document_id: UUID, 
        user_id: UUID,
        chunks_with_embeddings: List[Dict[str, Any]]
    ) -> int:
        """Store chunks with embeddings in vector database."""
        try:
            logger.debug(f"Storing chunks with embeddings for document {document_id}")
            stored_count = await self.vector_storage.store_document_chunks(document_id, user_id, chunks_with_embeddings)
            
            logger.info(f"Stored {stored_count} chunks in vector database")
            return stored_count
            
        except VectorStorageError as e:
            logger.error(f"Vector storage failed: {str(e)}")
            raise ChunkProcessingError(f"Failed to store chunks: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error during chunk storage: {str(e)}")
            raise ChunkProcessingError(f"Chunk storage error: {str(e)}") from e
    
    async def _get_processing_statistics(
        self, 
        document_id: UUID,
        original_chunks: List[Dict[str, Any]], 
        processed_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Get detailed processing statistics."""
        try:
            # Basic chunk statistics
            total_words = sum(chunk.get('word_count', 0) for chunk in original_chunks)
            total_chars = sum(chunk.get('char_count', 0) for chunk in original_chunks)
            
            # Embedding statistics
            chunks_with_embeddings = [chunk for chunk in processed_chunks if 'embedding' in chunk]
            embedding_success_rate = len(chunks_with_embeddings) / len(original_chunks) if original_chunks else 0
            
            # Vector dimension info
            vector_dimensions = []
            embedding_models = set()
            for chunk in chunks_with_embeddings:
                if 'vector_dimension' in chunk:
                    vector_dimensions.append(chunk['vector_dimension'])
                if 'embedding_model' in chunk:
                    embedding_models.add(chunk['embedding_model'])
            
            # Storage statistics
            storage_stats = await self.vector_storage.get_chunk_statistics(document_id)
            
            return {
                'chunk_statistics': {
                    'total_chunks': len(original_chunks),
                    'successful_embeddings': len(chunks_with_embeddings),
                    'embedding_success_rate': round(embedding_success_rate, 3),
                    'total_words': total_words,
                    'total_characters': total_chars,
                    'avg_words_per_chunk': round(total_words / len(original_chunks), 1) if original_chunks else 0,
                    'avg_chars_per_chunk': round(total_chars / len(original_chunks), 1) if original_chunks else 0
                },
                'embedding_statistics': {
                    'models_used': list(embedding_models),
                    'vector_dimensions': list(set(vector_dimensions)),
                    'avg_vector_dimension': round(sum(vector_dimensions) / len(vector_dimensions), 1) if vector_dimensions else 0
                },
                'storage_statistics': storage_stats
            }
            
        except Exception as e:
            logger.warning(f"Failed to get processing statistics: {str(e)}")
            return {'error': f"Statistics collection failed: {str(e)}"}
    
    def _create_processing_result(
        self, 
        total_chunks: int, 
        processed_chunks: int, 
        stored_chunks: int,
        status: str,
        error: Optional[str] = None,
        statistics: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a standardized processing result."""
        result = {
            'status': status,
            'total_chunks': total_chunks,
            'processed_chunks': processed_chunks,
            'stored_chunks': stored_chunks,
            'success_rate': round(stored_chunks / total_chunks, 3) if total_chunks > 0 else 0
        }
        
        if error:
            result['error'] = error
        
        if statistics:
            result['statistics'] = statistics
        
        return result
    
    async def reprocess_document_chunks(self, document_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """
        Reprocess chunks for a document (useful for updating embeddings with new models).
        
        Args:
            document_id: UUID of the document to reprocess
            
        Returns:
            Processing result dictionary
        """
        try:
            # Get existing chunks from storage (without embeddings)
            existing_chunks = await self.vector_storage.get_document_chunks(document_id)
            
            if not existing_chunks:
                return self._create_processing_result(0, 0, 0, "No existing chunks found")
            
            # Remove embedding data to force regeneration
            chunks_for_reprocessing = []
            for chunk in existing_chunks:
                chunk_data = chunk.copy()
                # Remove embedding-related fields
                for key in ['embedding', 'embedding_model', 'embedding_version', 'vector_dimension']:
                    chunk_data.pop(key, None)
                chunks_for_reprocessing.append(chunk_data)
            
            logger.info(f"Reprocessing {len(chunks_for_reprocessing)} chunks for document {document_id}")
            
            # Process through the embedding pipeline
            return await self.process_document_chunks(document_id, user_id, chunks_for_reprocessing)
            
        except Exception as e:
            logger.error(f"Chunk reprocessing failed for document {document_id}: {str(e)}")
            return self._create_processing_result(0, 0, 0, "failed", error=str(e))
    
    async def get_processing_status(self, document_id: UUID) -> Dict[str, Any]:
        """
        Get the current processing status for a document.
        
        Args:
            document_id: UUID of the document
            
        Returns:
            Status information including chunk counts and embedding info
        """
        try:
            storage_stats = await self.vector_storage.get_chunk_statistics(document_id)
            embedding_info = self.embedding_service.get_model_info()
            
            return {
                'document_id': str(document_id),
                'storage_statistics': storage_stats,
                'embedding_model_info': embedding_info,
                'is_processed': storage_stats['total_chunks'] > 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get processing status for document {document_id}: {str(e)}")
            return {
                'document_id': str(document_id),
                'error': str(e),
                'is_processed': False
            }


# Singleton instance for application use
chunk_processor = ChunkProcessor()