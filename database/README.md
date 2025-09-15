# Lemma Database Schema

This directory contains the complete database schema and migration files for the Lemma platform.

## Schema Overview

The database is designed to support an AI-powered academic paper analysis platform with the following core entities:

### Tables

1. **`users`** - User profiles extending Supabase auth
2. **`documents`** - PDF metadata and processing status
3. **`document_chunks`** - Text chunks with vector embeddings for RAG
4. **`chat_sessions`** - Conversation sessions per document
5. **`chat_messages`** - Individual messages with RAG context

### Key Features

- **Vector Search**: Uses `pg_vector` extension for semantic similarity search
- **Row Level Security**: Complete data isolation between users
- **Full-Text Search**: Searchable content across documents and messages
- **Audit Trail**: Comprehensive tracking of processing and usage
- **Performance Optimized**: Proper indexing for all query patterns

## Directory Structure

```
database/
├── schemas/           # Individual table schema files
│   ├── 01_users.sql
│   ├── 02_documents.sql
│   ├── 03_document_chunks.sql
│   ├── 04_chat_sessions.sql
│   └── 05_chat_messages.sql
├── migrations/        # Supabase migration files
│   ├── 20240915_001_initial_schema.sql
│   └── 20240915_002_rls_policies.sql
└── README.md
```

## Migration Instructions

### Prerequisites

1. Ensure `pg_vector` extension is enabled in your Supabase project:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

2. Verify the extension is installed:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Running Migrations

#### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor"
3. Run the migrations in order:
   - First: `20240915_001_initial_schema.sql`
   - Second: `20240915_002_rls_policies.sql`

#### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

#### Option 3: Manual Execution

Execute each schema file individually in your database:

```bash
# Connect to your database and run:
psql -h YOUR_HOST -U postgres -d postgres -f database/schemas/01_users.sql
psql -h YOUR_HOST -U postgres -d postgres -f database/schemas/02_documents.sql
# ... repeat for each schema file
```

## Schema Details

### Vector Embeddings

The `document_chunks` table uses vector embeddings for semantic search:
- **Dimension**: 1536 (OpenAI text-embedding-3-small)
- **Index Type**: HNSW for fast approximate similarity search
- **Distance Metric**: Cosine similarity

### Row Level Security

All tables have RLS policies ensuring:
- Users can only access their own data
- Automatic user profile creation on signup
- Secure cross-table relationships

### Performance Considerations

- **Vector Index**: HNSW index on embeddings for sub-second similarity search
- **Full-Text Search**: GIN indexes on content for fast text search
- **Composite Indexes**: Optimized for common query patterns
- **Partitioning**: Consider partitioning large tables by user_id in production

## Helper Functions

The schema includes several utility functions:

- `search_document_chunks()` - Semantic similarity search
- `get_user_document_count()` - Count user's documents
- `get_user_storage_usage()` - Calculate storage usage
- `handle_new_user()` - Automatic profile creation

## Usage Examples

### Searching Document Chunks

```sql
-- Search for chunks similar to a query
SELECT * FROM search_document_chunks(
    query_embedding := '[0.1, 0.2, ...]'::vector,
    user_uuid := auth.uid(),
    similarity_threshold := 0.8,
    match_count := 5
);
```

### Getting User Statistics

```sql
-- Get user's document count and storage usage
SELECT 
    get_user_document_count(auth.uid()) as document_count,
    get_user_storage_usage(auth.uid()) as storage_bytes;
```

## Security Notes

- All tables use Row Level Security (RLS)
- Sensitive operations use `SECURITY DEFINER` functions
- Vector search is isolated per user
- Automatic data cleanup for deleted documents

## Future Enhancements

Consider these improvements for scaling:

1. **Partitioning**: Partition large tables by user_id or date
2. **Archiving**: Move old data to separate archive tables
3. **Caching**: Add Redis for frequently accessed data
4. **Replication**: Set up read replicas for analytics
5. **Monitoring**: Add query performance monitoring

## Troubleshooting

### Common Issues

**Vector extension not found:**
```sql
-- Check if vector extension is installed
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- Install if missing
CREATE EXTENSION vector;
```

**RLS policies blocking queries:**
```sql
-- Temporarily disable RLS for debugging (NOT for production)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

**Slow vector searches:**
```sql
-- Check if HNSW index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'document_chunks' AND indexname LIKE '%embedding%';

-- Recreate index if missing
CREATE INDEX idx_document_chunks_embedding_hnsw 
ON document_chunks USING hnsw (embedding vector_cosine_ops);
```