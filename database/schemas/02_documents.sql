-- Documents table schema
-- Stores metadata for uploaded PDF documents

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- File information
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_hash TEXT NOT NULL, -- SHA-256 hash for deduplication
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    
    -- Storage information
    storage_path TEXT NOT NULL, -- Path in R2 bucket
    storage_bucket TEXT NOT NULL DEFAULT 'lemma-documents',
    
    -- Document metadata extracted from PDF
    title TEXT,
    authors TEXT[], -- Array of author names
    abstract TEXT,
    doi TEXT, -- Digital Object Identifier
    publication_year INTEGER,
    journal TEXT,
    keywords TEXT[], -- Array of keywords
    language VARCHAR(10) DEFAULT 'en', -- Document language (ISO 639-1 code)
    
    -- Processing information
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'processing', 'completed', 'failed', 'deleted')
    ),
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_error TEXT,
    
    -- Document statistics
    total_pages INTEGER,
    total_words INTEGER,
    total_chunks INTEGER DEFAULT 0,
    
    -- Content outline (table of contents)
    outline JSONB, -- Structured TOC with page numbers
    
    -- AI-powered enrichment data
    enrichment JSONB, -- Research questions, key contributions, methodology summary, etc.
    ai_enhancement_status JSONB, -- Status of AI enhancement: {success: boolean, error: string, timestamp: string}
    embedding_status JSONB, -- Status of embedding generation and storage: {status: string, model_name: string, total_chunks: int, etc.}
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Create updated_at trigger
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON public.documents 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON public.documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON public.documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_title ON public.documents USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_documents_abstract ON public.documents USING gin(to_tsvector('english', abstract));
CREATE INDEX IF NOT EXISTS idx_documents_authors ON public.documents USING gin(authors);
CREATE INDEX IF NOT EXISTS idx_documents_keywords ON public.documents USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_documents_not_deleted ON public.documents(user_id, created_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE public.documents IS 'Metadata for uploaded PDF documents';
COMMENT ON COLUMN public.documents.file_hash IS 'SHA-256 hash for duplicate detection';
COMMENT ON COLUMN public.documents.outline IS 'Document table of contents as structured JSON';
COMMENT ON COLUMN public.documents.enrichment IS 'AI-generated enrichment data including research questions, key contributions, methodology summary, reading time, technical terms, etc.';
COMMENT ON COLUMN public.documents.ai_enhancement_status IS 'Status of AI enhancement process with success flag, error message, and timestamp';
COMMENT ON COLUMN public.documents.embedding_status IS 'Status of embedding generation and storage process including model info, chunk counts, and completion status';
COMMENT ON COLUMN public.documents.processing_status IS 'Current processing state of the document';
COMMENT ON COLUMN public.documents.storage_path IS 'Path to file in object storage bucket';