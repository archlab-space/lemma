-- Initial database schema migration for Lemma
-- This migration creates all the core tables for the MVP

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create the trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Import all table schemas
\ir ../schemas/01_users.sql
\ir ../schemas/02_documents.sql
\ir ../schemas/03_document_chunks.sql
\ir ../schemas/04_chat_sessions.sql
\ir ../schemas/05_chat_messages.sql