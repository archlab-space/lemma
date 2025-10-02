"""
Vector Storage Service for Lemma
Handles vector storage and similarity search using pg_vector.
"""

import asyncio
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import json

from app.core.logging import get_logger
from app.db.session import get_db_session

logger = get_logger(__name__)


class VectorStorageError(Exception):
    """Exception for vector storage related errors."""
    pass


class VectorStorage:
    """
    Service for storing and retrieving document chunks with vector embeddings.
    
    Features:
    - Store document chunks with embeddings in pg_vector
    - Similarity search with cosine distance
    - Batch operations for efficiency
    - Metadata filtering
    """
    
    async def store_document_chunks(
        self, 
        document_id: UUID, 
        user_id: UUID,
        chunks: List[Dict[str, Any]]
    ) -> int:
        """
        Store document chunks with embeddings in the database.
        
        Args:
            document_id: UUID of the document
            chunks: List of chunks with embeddings
            
        Returns:
            Number of chunks stored
        """
        if not chunks:
            return 0
        
        # Filter chunks that have embeddings
        chunks_with_embeddings = [
            chunk for chunk in chunks 
            if 'embedding' in chunk and chunk['embedding']
        ]
        
        if not chunks_with_embeddings:
            logger.warning(f"No chunks with embeddings found for document {document_id}")
            return 0
        
        logger.info(f"Storing {len(chunks_with_embeddings)} chunks for document {document_id}")
        
        try:
            async with get_db_session() as session:
                # Clear existing chunks for this document
                await session.execute(
                    "DELETE FROM public.document_chunks WHERE document_id = $1",
                    document_id
                )
                
                # Insert new chunks using batch insert
                stored_count = await self._batch_insert_chunks(session, document_id, user_id, chunks_with_embeddings)
                
                logger.info(f"Successfully stored {stored_count} chunks for document {document_id}")
                return stored_count
                
        except Exception as e:
            logger.error(f"Failed to store chunks for document {document_id}: {str(e)}")
            raise VectorStorageError(f"Failed to store document chunks: {str(e)}") from e
    
    async def _batch_insert_chunks(self, session, document_id: UUID, user_id: UUID, chunks: List[Dict[str, Any]]) -> int:
        """Batch insert chunks for better performance."""
        if not chunks:
            return 0
        
        # Prepare batch data
        batch_data = []
        for chunk in chunks:
            if 'embedding' not in chunk or not chunk['embedding']:
                continue
                
            # Prepare chunk data
            content = chunk.get('content', '')
            embedding = chunk.get('embedding', [])
            page_number = chunk.get('page_number', 1)
            chunk_index = chunk.get('chunk_index', 0)
            word_count = chunk.get('word_count', 0)
            char_count = chunk.get('char_count', len(content))
            token_count = chunk.get('token_count')
            embedding_model = chunk.get('embedding_model', 'text-embedding-3-small')
            embedding_model_version = chunk.get('embedding_version', 'v1')
            
            # Additional metadata that doesn't have dedicated columns
            metadata = {
                'chunk_type': chunk.get('chunk_type', 'unknown'),
                'block_id': chunk.get('block_id'),
                'bbox': chunk.get('bbox'),
                'part_of_block': chunk.get('part_of_block', False),
                'block_part': chunk.get('block_part'),
                'sentence_count': chunk.get('sentence_count')
            }
            
            # Remove None values from metadata
            metadata = {k: v for k, v in metadata.items() if v is not None}
            
            batch_data.append((
                document_id,
                user_id,
                content,
                chunk_index,
                page_number,
                word_count,
                char_count,
                embedding,
                embedding_model,
                embedding_model_version,
                token_count,
                json.dumps(metadata) if metadata else None
            ))
        
        if not batch_data:
            logger.warning("No valid chunks with embeddings found for batch insert")
            return 0
        
        # Use executemany for batch insert
        try:
            await session.executemany("""
                INSERT INTO public.document_chunks (
                    document_id,
                    user_id,
                    content,
                    chunk_index,
                    page_number,
                    word_count,
                    char_count,
                    embedding,
                    embedding_model,
                    embedding_model_version,
                    token_count,
                    metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            """, batch_data)
            
            logger.debug(f"Batch inserted {len(batch_data)} chunks")
            return len(batch_data)
            
        except Exception as e:
            logger.error(f"Batch insert failed: {str(e)}")
            raise VectorStorageError(f"Batch insert failed: {str(e)}") from e
    
    
    async def similarity_search(
        self,
        query_embedding: List[float],
        document_id: Optional[UUID] = None,
        limit: int = 10,
        min_similarity: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks using cosine similarity.

        Args:
            query_embedding: The query vector
            document_id: Optional document ID to filter by
            limit: Maximum number of results
            min_similarity: Minimum cosine similarity threshold

        Returns:
            List of similar chunks with similarity scores
        """
        try:
            async with get_db_session() as session:
                # Convert embedding list to PostgreSQL vector format
                embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'

                # Build the query
                where_clause = ""
                params: List[Any] = [embedding_str, limit]

                if document_id:
                    where_clause = "WHERE dc.document_id = $3"
                    params.append(document_id)
                
                # Use cosine distance (1 - cosine_similarity)
                # Lower distance = higher similarity
                query = f"""
                    SELECT 
                        dc.id,
                        dc.document_id,
                        dc.content,
                        dc.page_number,
                        dc.chunk_index,
                        dc.word_count,
                        dc.char_count,
                        dc.embedding_model,
                        dc.embedding_model_version,
                        dc.token_count,
                        dc.metadata,
                        dc.created_at,
                        d.title as document_title,
                        d.filename as document_filename,
                        1 - (dc.embedding <=> $1) as similarity_score
                    FROM public.document_chunks dc
                    JOIN public.documents d ON dc.document_id = d.id
                    {where_clause}
                    ORDER BY dc.embedding <=> $1
                    LIMIT $2
                """
                
                results = await session.fetch(query, *params)
                
                # Filter by minimum similarity and format results
                similar_chunks = []
                for row in results:
                    similarity_score = float(row['similarity_score'])
                    
                    if similarity_score >= min_similarity:
                        chunk_data = {
                            'id': str(row['id']),
                            'document_id': str(row['document_id']),
                            'content': row['content'],
                            'page_number': row['page_number'],
                            'chunk_index': row['chunk_index'],
                            'word_count': row['word_count'],
                            'char_count': row['char_count'],
                            'embedding_model': row['embedding_model'],
                            'embedding_model_version': row['embedding_model_version'],
                            'token_count': row['token_count'],
                            'metadata': json.loads(row['metadata']) if row['metadata'] else {},
                            'similarity_score': similarity_score,
                            'document_title': row['document_title'],
                            'document_filename': row['document_filename'],
                            'created_at': row['created_at'].isoformat() if row['created_at'] else None
                        }
                        similar_chunks.append(chunk_data)
                
                logger.debug(f"Found {len(similar_chunks)} similar chunks (min_similarity={min_similarity})")
                return similar_chunks
                
        except Exception as e:
            logger.error(f"Similarity search failed: {str(e)}")
            raise VectorStorageError(f"Similarity search failed: {str(e)}") from e
    
    async def get_document_chunks(
        self, 
        document_id: UUID, 
        page_number: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all chunks for a document, optionally filtered by page.
        
        Args:
            document_id: UUID of the document
            page_number: Optional page number filter
            
        Returns:
            List of document chunks
        """
        try:
            async with get_db_session() as session:
                where_clause = "WHERE document_id = $1"
                params: List[Any] = [document_id]
                
                if page_number is not None:
                    where_clause += " AND page_number = $2"
                    params.append(page_number)
                
                query = f"""
                    SELECT 
                        id, document_id, content, page_number, chunk_index,
                        word_count, char_count, embedding_model, embedding_model_version,
                        token_count, metadata, created_at
                    FROM public.document_chunks
                    {where_clause}
                    ORDER BY chunk_index
                """
                
                results = await session.fetch(query, *params)
                
                chunks = []
                for row in results:
                    chunk_data = {
                        'id': str(row['id']),
                        'document_id': str(row['document_id']),
                        'content': row['content'],
                        'page_number': row['page_number'],
                        'chunk_index': row['chunk_index'],
                        'word_count': row['word_count'],
                        'char_count': row['char_count'],
                        'embedding_model': row['embedding_model'],
                        'embedding_model_version': row['embedding_model_version'],
                        'token_count': row['token_count'],
                        'metadata': json.loads(row['metadata']) if row['metadata'] else {},
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    }
                    chunks.append(chunk_data)
                
                return chunks
                
        except Exception as e:
            logger.error(f"Failed to get chunks for document {document_id}: {str(e)}")
            raise VectorStorageError(f"Failed to get document chunks: {str(e)}") from e
    
    async def delete_document_chunks(self, document_id: UUID) -> int:
        """
        Delete all chunks for a document.
        
        Args:
            document_id: UUID of the document
            
        Returns:
            Number of chunks deleted
        """
        try:
            async with get_db_session() as session:
                result = await session.execute(
                    "DELETE FROM public.document_chunks WHERE document_id = $1",
                    document_id
                )
                
                # Parse the result properly
                if result and hasattr(result, 'split'):
                    deleted_count = result.split()[-1]
                    deleted_count_int = int(deleted_count) if deleted_count.isdigit() else 0
                else:
                    deleted_count_int = 0
                
                logger.info(f"Deleted {deleted_count_int} chunks for document {document_id}")
                return deleted_count_int
                
        except Exception as e:
            logger.error(f"Failed to delete chunks for document {document_id}: {str(e)}")
            raise VectorStorageError(f"Failed to delete document chunks: {str(e)}") from e
    
    async def get_chunk_statistics(self, document_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Get statistics about stored chunks.
        
        Args:
            document_id: Optional document ID to filter by
            
        Returns:
            Dictionary with chunk statistics
        """
        try:
            async with get_db_session() as session:
                where_clause = ""
                params: List[Any] = []
                
                if document_id:
                    where_clause = "WHERE document_id = $1"
                    params.append(document_id)
                
                query = f"""
                    SELECT 
                        COUNT(*) as total_chunks,
                        AVG(word_count) as avg_word_count,
                        AVG(char_count) as avg_char_count,
                        MIN(page_number) as min_page,
                        MAX(page_number) as max_page
                    FROM public.document_chunks
                    {where_clause}
                """
                
                result = await session.fetchrow(query, *params)
                
                if result:
                    return {
                        'total_chunks': int(result['total_chunks']) if result['total_chunks'] else 0,
                        'avg_word_count': float(result['avg_word_count']) if result['avg_word_count'] else 0.0,
                        'avg_char_count': float(result['avg_char_count']) if result['avg_char_count'] else 0.0,
                        'min_page': int(result['min_page']) if result['min_page'] else 0,
                        'max_page': int(result['max_page']) if result['max_page'] else 0,
                        'document_id': str(document_id) if document_id else None
                    }
                else:
                    return {
                        'total_chunks': 0,
                        'avg_word_count': 0.0,
                        'avg_char_count': 0.0,
                        'min_page': 0,
                        'max_page': 0,
                        'document_id': str(document_id) if document_id else None
                    }
                
        except Exception as e:
            logger.error(f"Failed to get chunk statistics: {str(e)}")
            raise VectorStorageError(f"Failed to get chunk statistics: {str(e)}") from e


# Singleton instance for application use
vector_storage = VectorStorage()