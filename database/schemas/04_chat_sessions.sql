-- Chat sessions table schema
-- Stores chat conversation sessions for document interactions

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    
    -- Session metadata
    title TEXT NOT NULL DEFAULT 'New Chat',
    description TEXT,
    
    -- Session status
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('active', 'archived', 'deleted')
    ),
    
    -- Session statistics
    message_count INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    
    -- Last activity tracking
    last_message_at TIMESTAMPTZ,
    
    -- Session configuration
    model_used VARCHAR(100), -- LLM model used for this session
    temperature FLOAT DEFAULT 0.1,
    max_tokens INTEGER DEFAULT 2000,
    
    -- Context management
    context_window_size INTEGER DEFAULT 200000,
    system_prompt TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    archived_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Create updated_at trigger
CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON public.chat_sessions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_document_id ON public.chat_sessions(document_id);

-- Comments
COMMENT ON TABLE public.chat_sessions IS 'Chat conversation sessions for document interactions';
COMMENT ON COLUMN public.chat_sessions.title IS 'User-friendly title for the chat session';
COMMENT ON COLUMN public.chat_sessions.context_window_size IS 'Maximum tokens for conversation context';
COMMENT ON COLUMN public.chat_sessions.system_prompt IS 'System prompt used for this session';
COMMENT ON COLUMN public.chat_sessions.total_tokens_used IS 'Total tokens consumed in this session';