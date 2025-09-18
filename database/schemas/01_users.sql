-- Users table schema
-- Extends Supabase auth.users with additional profile information

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    
    -- User preferences
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    language VARCHAR(10) DEFAULT 'en',
    
    -- Usage tracking
    documents_uploaded INTEGER DEFAULT 0,
    queries_asked INTEGER DEFAULT 0,
    storage_used_bytes BIGINT DEFAULT 0,
    
    -- Plan and limits
    plan_type VARCHAR(20) DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    max_documents INTEGER DEFAULT 10,
    max_storage_bytes BIGINT DEFAULT 1073741824, -- 1GB in bytes
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMPTZ
);

-- Create updated_at trigger
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan_type ON public.users(plan_type);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- Comments
COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN public.users.storage_used_bytes IS 'Total storage used by user in bytes';
COMMENT ON COLUMN public.users.max_storage_bytes IS 'Maximum storage allowed for user plan';