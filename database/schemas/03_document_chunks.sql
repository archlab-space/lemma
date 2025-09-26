-- Document chunks table schema
-- Stores text chunks with vector embeddings for RAG retrieval

CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Chunk content and metadata
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL, -- Order within document
    
    -- Page information
    page_number INTEGER,
    
    -- Content metrics
    word_count INTEGER,
    char_count INTEGER,
    
    -- Vector embeddings (using pg_vector extension)
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
    
    -- Chunk processing metadata
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_model_version VARCHAR(20) DEFAULT 'v1',
    
    -- Content tokens (for LLM context management)
    token_count INTEGER,
    
    -- Additional metadata as JSON
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create updated_at trigger
CREATE TRIGGER update_document_chunks_updated_at 
    BEFORE UPDATE ON public.document_chunks 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);

-- Vector similarity search index (using HNSW for fast approximate search)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
    ON public.document_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index for exact search (uncomment if needed)
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_ivfflat 
--     ON public.document_chunks 
--     USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);

-- Full-text search index on content
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_fts 
    ON public.document_chunks 
    USING gin(to_tsvector('english', content));

-- Comments
COMMENT ON TABLE public.document_chunks IS 'Text chunks with vector embeddings for RAG retrieval';
COMMENT ON COLUMN public.document_chunks.embedding IS 'Vector embedding for semantic similarity search';
COMMENT ON COLUMN public.document_chunks.chunk_index IS 'Sequential order of chunk within document';
COMMENT ON COLUMN public.document_chunks.word_count IS 'Number of words in the chunk';
COMMENT ON COLUMN public.document_chunks.char_count IS 'Number of characters in the chunk';
COMMENT ON COLUMN public.document_chunks.token_count IS 'Number of tokens for LLM context management';
COMMENT ON COLUMN public.document_chunks.metadata IS 'Additional chunk metadata as JSON';