# Contributing to Lemma

Thanks for your interest in contributing! This guide will get you set up for local development.

## Local Development Setup

Lemma is a monorepo with three services that need to run together.

### Prerequisites

- Node.js 20+, pnpm 9+
- Python 3.12+
- A Supabase project
- A Cloudflare account with Workers and R2 enabled

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/lemma.git
cd lemma
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your Supabase, Cloudflare, and LLM API credentials
```

### 3. Set up the database

Follow [database/README.md](database/README.md) to run the migrations in your Supabase project.

### 4. Start the backend (FastAPI)

```bash
cd backend
pip install -e ".[dev]"
uvicorn main:app --reload --port 8000
```

### 5. Start the edge worker (Cloudflare Workers)

```bash
cd edge
# Edit wrangler.jsonc: replace YOUR_PROJECT_ID and your-cloudflare-account-id
pnpm dev
```

### 6. Start the frontend (Next.js)

```bash
cd frontend
# Create frontend/.env.local with your Supabase URL and anon key
pnpm dev
```

## Making Changes

### Branch naming

```
feat/short-description     # New features
fix/short-description      # Bug fixes
docs/short-description     # Documentation only
refactor/short-description # Refactoring without behavior change
```

### Commit messages

Use imperative form, keep it concise:

```
Add streaming response handler for edge worker
Fix chunk overlap calculation in semantic splitter
Update Quick Start instructions in README
```

### Pull Requests

- Describe **what** changed and **why** (not just how)
- Link any related GitHub issue
- Keep PRs focused — one logical change per PR
- Make sure `pnpm typecheck` and `pnpm lint` pass before submitting

## Reporting Issues

Use GitHub Issues:

- **Bug** — Use the bug report template. Include steps to reproduce and your environment.
- **Feature request** — Use the feature request template. Describe the problem you're solving.
- **Question** — Open a GitHub Discussion instead.

## Code Style

- TypeScript with strict mode for all JS/TS code
- Python 3.12+ with type hints throughout
- No unnecessary comments — name things clearly instead
- Follow existing patterns in the codebase

## Project Structure

```
lemma/
├── frontend/   # Next.js 15 (Cloudflare Pages)
├── backend/    # FastAPI (Google Cloud Run)
├── edge/       # Cloudflare Workers
├── database/   # SQL migrations
└── docs/       # Infrastructure docs
```
