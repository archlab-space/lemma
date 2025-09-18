# Lemma Infrastructure Setup Guide

This guide will walk you through setting up all the external services needed for the Lemma platform.

## Phase 1.2: Environment & Infrastructure Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login with your account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: `lemma`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier
6. Click "Create new project"
7. Wait for the project to be provisioned (2-3 minutes)

**Save these values from your project settings:**
- Project URL: `https://xxx.supabase.co`
- Anon/Public Key: `eyJhbGciOiJ...`
- Service Role Key: `eyJhbGciOiJ...` (keep this secret!)

**Get Direct PostgreSQL Connection String:**
1. Go to `Connect`
2. Find "Transaction pooler" section
3. Copy the "URI" connection string
4. Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
5. This will be your `DATABASE_URL` for direct asyncpg connections

### 2. Enable pg_vector Extension

1. In your Supabase dashboard, go to "SQL Editor"
2. Click "New Query"
3. Run this SQL command:
```sql
-- Enable the pg_vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```
4. Click "Run" to execute
5. You should see the vector extension listed in the results

### 3. Set up Cloudflare Account and R2 Bucket

#### Cloudflare Account Setup
1. Go to [cloudflare.com](https://cloudflare.com)
2. Sign up/login to your account
3. Go to "Workers & Pages" from the sidebar
4. If needed, set up a custom subdomain for Workers

#### R2 Storage Setup
1. In Cloudflare dashboard, go to "R2 Object Storage"
2. Click "Create bucket"
3. Configure bucket:
   - **Bucket name**: `lemma-documents`
   - **Location**: Choose your preferred region
4. Click "Create bucket"

#### Get R2 API Credentials
1. Go to "Manage R2 API tokens"
2. Click "Create API token"
3. Configure token:
   - **Token name**: `lemma-r2-token`
   - **Permissions**: Object Read & Write
   - **Specify bucket**: Select `lemma-documents`
4. Click "Create API token"
5. **Save these values:**
   - Access Key ID
   - Secret Access Key
   - Endpoint URL (format: `https://xxx.r2.cloudflarestorage.com`)

### 4. Configure Cloudflare Workers Environment

1. Install Wrangler CLI:
```bash
pnpm add -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. In the `edge/` directory, create `wrangler.toml`:
```toml
name = "lemma-edge"
main = "src/index.ts"
compatibility_date = "2024-09-02"
compatibility_flags = ["nodejs_compat"]

[vars]
SUPABASE_URL = "https://xxx.supabase.co"
SUPABASE_ANON_KEY = "your-anon-key"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "lemma-documents"
```

4. Set secrets (run in `edge/` directory):
```bash
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

### 5. Set up Google Cloud Run for Backend

#### Prerequisites
1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
2. Create Google Cloud Project: https://console.cloud.google.com/

#### Setup Steps
1. Enable required APIs:
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

2. Set your project:
```bash
gcloud config set project YOUR_PROJECT_ID
```

3. Create service account for Cloud Run:
```bash
gcloud iam service-accounts create lemma-backend \
  --display-name="Lemma Backend Service Account"
```

4. In the `backend/` directory, create `Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen

COPY . .

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

5. Create `.dockerignore`:
```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
.pytest_cache/
.mypy_cache/
```

### 6. Create Development Environment Variables Template

Create `.env.example` in the root directory with all required environment variables:

```bash
# Copy this file to .env and fill in your actual values

# Supabase Configuration
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJ...
SUPABASE_SERVICE_KEY=eyJhbGciOiJ...

# Cloudflare R2 Configuration
R2_BUCKET_NAME=lemma-documents
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# LLM API Configuration
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...

# Backend Configuration
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Google Cloud Configuration (for production)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

## Next Steps

After completing this setup:

1. Copy `.env.example` to `.env` and fill in your actual values
2. Run `pnpm install` to install all dependencies
3. Test the setup by running `pnpm dev`
4. Proceed to Phase 1.3 (Database Schema Design)

## Troubleshooting

### Common Issues

**Supabase Connection Issues:**
- Verify your project URL and API keys
- Check if pg_vector extension is properly installed
- Ensure your IP is allowlisted (if using IP restrictions)

**Cloudflare R2 Issues:**
- Verify bucket name and region
- Check API token permissions
- Ensure CORS is configured if accessing from browser

**Google Cloud Issues:**
- Verify project ID and region
- Check service account permissions
- Ensure billing is enabled

**Environment Variables:**
- Double-check all environment variable names
- Ensure no trailing spaces or quotes in values
- Verify `.env` file is in the correct location