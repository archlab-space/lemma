-- Chat messages table schema
-- Stores individual messages within chat sessions

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    
    -- Message ordering
    sequence_number INTEGER NOT NULL,
    
    -- Token usage for this message
    token_count INTEGER,
    
    -- RAG context information (for assistant messages)
    retrieved_chunks UUID[], -- Array of document_chunk IDs used for context
    chunks_used_count INTEGER DEFAULT 0,
    retrieval_query TEXT, -- The query used for chunk retrieval
    retrieval_score FLOAT, -- Average similarity score of retrieved chunks
    
    -- LLM metadata (for assistant messages)
    model_used VARCHAR(100),
    model_version VARCHAR(20),
    temperature FLOAT,
    finish_reason VARCHAR(50), -- 'stop', 'length', 'content_filter', etc.
    
    -- Response timing
    processing_time_ms INTEGER, -- Time to generate response
    retrieval_time_ms INTEGER,  -- Time to retrieve relevant chunks
    
    -- Message status
    status VARCHAR(20) DEFAULT 'completed' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'edited')
    ),
    error_message TEXT,
    
    -- User feedback
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    is_helpful BOOLEAN,
    
    -- Message metadata
    is_edited BOOLEAN DEFAULT FALSE,
    edit_count INTEGER DEFAULT 0,
    parent_message_id UUID REFERENCES public.chat_messages(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Create updated_at trigger
CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON public.chat_messages 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- Comments
COMMENT ON TABLE public.chat_messages IS 'Individual messages within chat sessions';
COMMENT ON COLUMN public.chat_messages.retrieved_chunks IS 'Array of document chunk IDs used for RAG context';
COMMENT ON COLUMN public.chat_messages.sequence_number IS 'Order of message within the session';
COMMENT ON COLUMN public.chat_messages.retrieval_query IS 'Query used to retrieve relevant document chunks';
COMMENT ON COLUMN public.chat_messages.processing_time_ms IS 'Time taken to generate the response in milliseconds';
COMMENT ON COLUMN public.chat_messages.finish_reason IS 'Reason why the LLM stopped generating (stop, length, etc.)';
COMMENT ON COLUMN public.chat_messages.parent_message_id IS 'Reference to parent message for edited/branched conversations';