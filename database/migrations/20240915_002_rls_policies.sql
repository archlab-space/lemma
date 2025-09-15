-- Row Level Security (RLS) policies migration
-- This migration sets up security policies to ensure data isolation between users

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can only see and modify their own profile
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Documents table policies
-- Users can only access their own documents
CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- Document chunks table policies
-- Users can only access chunks from their own documents
CREATE POLICY "Users can view chunks from their own documents" ON public.document_chunks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert chunks for their own documents" ON public.document_chunks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update chunks from their own documents" ON public.document_chunks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete chunks from their own documents" ON public.document_chunks
    FOR DELETE USING (auth.uid() = user_id);

-- Chat sessions table policies
-- Users can only access their own chat sessions
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions
    FOR SELECT USING (auth.uid() = user_id AND status != 'deleted');

CREATE POLICY "Users can insert their own chat sessions" ON public.chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" ON public.chat_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Chat messages table policies
-- Users can only access messages from their own chat sessions
CREATE POLICY "Users can view their own chat messages" ON public.chat_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat messages" ON public.chat_messages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages" ON public.chat_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile when a new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create helper functions for common operations

-- Function to get user's document count
CREATE OR REPLACE FUNCTION public.get_user_document_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.documents
        WHERE user_id = user_uuid AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's storage usage
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(user_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(file_size_bytes), 0)
        FROM public.documents
        WHERE user_id = user_uuid AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search document chunks by similarity
CREATE OR REPLACE FUNCTION public.search_document_chunks(
    query_embedding VECTOR(1536),
    user_uuid UUID,
    document_uuid UUID DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    similarity FLOAT,
    page_number INTEGER,
    section_title TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        (1 - (dc.embedding <=> query_embedding)) AS similarity,
        dc.page_number,
        dc.section_title
    FROM public.document_chunks dc
    WHERE dc.user_id = user_uuid
        AND (document_uuid IS NULL OR dc.document_id = document_uuid)
        AND (1 - (dc.embedding <=> query_embedding)) > similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;