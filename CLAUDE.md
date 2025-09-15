# Lemma - AI-Powered Academic Paper Analysis Platform

## Project Overview

**Vision**: Fundamentally accelerate scientific learning and research globally.
**Mission**: Empower researchers, students, and professionals to grasp core concepts of complex academic papers through an intuitive, interactive, AI-driven web application.

## Core Product Concept
Users upload academic PDFs, interact with papers through AI-powered chat interface for summaries, explanations, and Q&A. Focus on speed, accuracy, and interactivity.

## Target Audience
- PhD/Master's students
- University researchers  
- Corporate R&D professionals

## Key Pain Points Addressed
- Information overload during literature reviews
- Time constraints for in-depth paper reading
- Complexity barriers with dense jargon and methodologies

## Competitive Positioning
Sweet spot between simple (ChatPDF) and sprawling (SciSpace). Focus on superior UX with robust, low-latency, streaming-first architecture.

## Technical Architecture

### Frontend
- **Framework**: Next.js (React + TypeScript)
- **Deployment**: Cloudflare Pages
- **Features**: Streaming UI, PDF upload, interactive chat

### Edge API / Orchestrator
- **Technology**: Cloudflare Workers (TypeScript)
- **Role**: Public API gateway, authentication, request orchestration
- **Key Feature**: Streaming passthrough from AI backend

### AI Backend / Heavy Lifter
- **Technology**: Python 3.10+ with FastAPI
- **Role**: Private microservice for compute-intensive tasks
- **Core Logic**: RAG implementation, PDF parsing, embeddings, LLM communication
- **Deployment**: Serverless containers (Google Cloud Run/AWS Fargate)

### Data Stack
- **File Storage**: Cloudflare R2 (zero egress fees)
- **Database**: Supabase PostgreSQL with pg_vector extension
- **Auth**: Supabase Auth (JWT)

## Key Data Flows

### Flow 1: PDF Ingestion (Async)
1. Frontend uploads PDF to pre-signed R2 URL
2. Upload completion triggers Cloudflare Worker
3. Worker calls FastAPI backend
4. FastAPI processes PDF (parse → chunk → embed → store in Supabase)

### Flow 2: Streaming Q&A (Real-time)
1. Frontend sends question to Cloudflare Worker `/api/ask`
2. Worker authenticates and forwards to FastAPI
3. FastAPI queries pg_vector, constructs prompt, calls LLM with streaming
4. FastAPI streams response back through Worker to Frontend
5. Frontend displays real-time typing effect

## Development Guidelines

### Project Structure
- Use monorepo structure (Turborepo recommended)
- Separate packages: `frontend/` (Next.js), `backend/` (FastAPI), `edge/` (Cloudflare Workers)

### Code Standards
- TypeScript for all JavaScript/Node.js code
- Python 3.10+ with type hints for backend
- Follow existing patterns and conventions
- No unnecessary comments unless complex logic requires explanation

### Key Dependencies to Expect
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Supabase client
- **Backend**: FastAPI, PyMuPDF, sentence-transformers, asyncio, Supabase Python client
- **Edge**: @cloudflare/workers-types, Supabase client

### Testing Strategy
- Unit tests for core RAG logic
- Integration tests for streaming pipeline
- E2E tests for complete user flows
- Test with diverse academic PDFs early and often

## MVP Phase Requirements

### Core Features
1. **Secure PDF Upload**: Direct upload to Cloudflare R2
2. **Smart Summary**: Auto-generate paper summary
3. **Structured Outline**: Extract and display section headings
4. **Interactive Q&A**: Streaming chat interface with RAG
5. **User Authentication**: Supabase Auth integration

### Technical Requirements
- All responses must stream token-by-token
- RAG must only use document content (no external knowledge)
- Support papers up to 50 pages initially
- Response time under 3 seconds for queries
- Mobile-responsive design

## Critical Implementation Notes

### PDF Processing Challenges
- Academic papers have complex layouts, equations, figures, tables
- Need semantic chunking by sections, not simple text splitting
- Consider specialized academic PDF parsers
- Test with diverse journal formats early

### RAG Implementation
- Use pg_vector for MVP simplicity
- Implement semantic chunking strategies
- Preserve document structure and context
- Handle citations and references properly

### Streaming Pipeline
- Critical for UX differentiation
- Must work seamlessly through edge → backend → LLM → backend → edge → frontend
- Handle errors gracefully in streaming context
- Implement proper backpressure handling

### Security & Performance
- Secure file uploads with pre-signed URLs
- JWT validation at edge layer
- Rate limiting for API endpoints
- Efficient vector similarity search

## Future Enhancements (Post-MVP)
- Multi-paper chat and comparison
- Figure and table interpretation (multimodal)
- Personal knowledge library
- Citation graph analysis
- Cross-paper recommendation system

## Development Commands
```bash
# Frontend
pnpm run dev          # Start Next.js dev server
pnpm run build        # Build for production
pnpm run lint         # Run ESLint
pnpm run typecheck    # TypeScript checks

# Backend
python -m uvicorn main:app --reload  # Start FastAPI dev server
pytest                               # Run tests
python -m pytest --cov             # Run tests with coverage

# Edge (Cloudflare Workers)
wrangler dev         # Start local development
wrangler deploy      # Deploy to Cloudflare
```

## Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `OPENAI_API_KEY` - OpenAI API key (or other LLM provider)
- `R2_BUCKET_NAME` - Cloudflare R2 bucket name
- `R2_ACCESS_KEY_ID` - R2 access credentials
- `R2_SECRET_ACCESS_KEY` - R2 secret credentials

## Success Metrics
- PDF processing time < 30 seconds for 20-page papers
- Query response time < 3 seconds
- Streaming latency < 200ms first token
- 95% accuracy in document-based Q&A
- Support for major academic PDF formats