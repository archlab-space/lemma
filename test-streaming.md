# Streaming Pipeline Test Guide

This guide helps you test the end-to-end streaming pipeline across all three layers:
1. **Backend (FastAPI)** - Generates streaming responses
2. **Edge (Cloudflare Worker)** - Proxies streams with error handling  
3. **Frontend (Next.js)** - Consumes streams with React components

## Quick Test Setup

### 0. Environment Setup (First Time Only)
```bash
# Copy environment template and configure
cp .env.example .env
# Edit .env with your actual Supabase, R2, and LLM API credentials
```

### 1. Start Backend (Terminal 1)
```bash
# Simplest: Use root-level script
pnpm run dev:backend

# Or from backend directory:
cd backend
pnpm run dev

# Check configuration is loaded correctly:
pnpm run config:check
```

### 2. Start Edge Worker (Terminal 2) 
```bash
# From root:
pnpm run dev:edge

# Or from edge directory:
cd edge
pnpm dev
# Worker will be available at http://localhost:8787
```

### 3. Start Frontend (Terminal 3)
```bash
# From root:
pnpm run dev:frontend

# Or from frontend directory:
cd frontend  
pnpm dev
# Frontend will be available at http://localhost:3000
```

## Test Endpoints

### Direct Backend Testing
- **Health**: http://localhost:8000/api/v1/health
- **Basic Stream**: http://localhost:8000/api/v1/streaming/test
- **Typing Effect**: http://localhost:8000/api/v1/streaming/typing
- **AI Simulation**: http://localhost:8000/api/v1/streaming/ai-response
- **SSE Demo**: http://localhost:8000/api/v1/streaming/sse

### Edge Worker Testing
- **Health**: http://localhost:8787/health
- **Proxied Health**: http://localhost:8787/api/v1/health  
- **Proxied Streaming**: http://localhost:8787/api/v1/streaming/test

### Production Edge Features
- **JWT Authentication**: Send `Authorization: Bearer <token>` header
- **Rate Limiting**: Check `X-RateLimit-*` headers in responses
- **Request Tracing**: Every response includes `X-Request-ID` header
- **KV Rate Limiting**: Persistent across worker instances (requires KV setup)

### Frontend Testing
- **Complete Demo**: http://localhost:3000
- The page includes interactive demos for all streaming types

## Manual Testing with cURL

### Test Backend Streaming
```bash
# Basic streaming test
curl -N http://localhost:8000/api/v1/streaming/test

# Typing effect
curl -N http://localhost:8000/api/v1/streaming/typing

# SSE format
curl -N -H "Accept: text/event-stream" http://localhost:8000/api/v1/streaming/sse
```

### Test Through Edge Worker
```bash
# Test edge proxy
curl -N http://localhost:8787/api/v1/streaming/test

# Test with headers
curl -N -H "Accept: text/event-stream" http://localhost:8787/api/v1/streaming/sse

# Test with JWT authentication (if you have a token)
curl -N -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:8787/api/v1/streaming/test

# Test JWT authentication with health endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:8787/health
# Should show user info in the response if token is valid

# Check rate limiting headers
curl -I http://localhost:8787/api/v1/health
# Look for: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

# Test rate limiting (make 101+ requests quickly to see 429 response)
for i in {1..105}; do curl -s http://localhost:8787/api/v1/health; done
```

## Expected Behaviors

### ✅ Working Pipeline
- **Backend**: Streams JSON data chunks with delays
- **Edge**: Proxies stream seamlessly with CORS headers
- **Frontend**: Displays streaming text with typing effect
- **Error Handling**: Graceful error messages in SSE format

### 🔧 Troubleshooting

**Environment Variables Issues?**
```bash
# Check if .env exists in root
ls -la .env

# Verify environment variables are loaded
uv run --directory backend python -c "from app.core.config import get_settings; print(get_settings().SUPABASE_URL)"

# Test database connection
uv run --directory backend python -c "
from app.core.config import get_settings
settings = get_settings()
print(f'Database URL: {settings.database_url_async}')
print(f'Supabase URL: {settings.SUPABASE_URL}')
"
```

**Backend not starting?**
```bash
# Install dependencies first
cd backend
uv sync

# Check if configuration loads correctly
uv run --env-file ../.env python -c "from app.core.config import get_settings; print('Config loaded successfully')"
```

**Backend database connection errors?**
- Ensure `DATABASE_URL` is set in `.env` with your actual Supabase PostgreSQL connection string
- Check that pg_vector extension is enabled in Supabase
- Verify your Supabase project is running

**Edge worker errors?**
```bash
cd edge
pnpm install  # Install dependencies
# Check wrangler.jsonc configuration for BACKEND_URL

# Setup KV namespace for rate limiting (optional, but recommended)
wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "RATE_LIMIT_KV" --preview
# Update wrangler.jsonc with the returned namespace IDs

# Generate TypeScript types
pnpm run cf-typegen
```

**Frontend connection issues?**
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Verify edge worker is proxying correctly

**CORS Issues?**
- Backend includes CORS headers
- Edge worker adds comprehensive CORS support
- Check browser dev tools Network tab

## Performance Testing

### Load Testing with cURL
```bash
# Multiple concurrent streams
for i in {1..10}; do
  curl -N http://localhost:8787/api/v1/streaming/test &
done
```

### Browser DevTools
1. Open Network tab
2. Start a stream from the frontend
3. Look for:
   - Streaming response (transfer-encoding: chunked)
   - Proper CORS headers
   - SSE events in real-time

## Architecture Validation

### Data Flow Test
1. **Frontend** sends request to http://localhost:3000
2. **Next.js** forwards to edge worker
3. **Edge Worker** proxies to backend
4. **Backend** streams response
5. **Edge Worker** pipes stream back
6. **Frontend** displays streaming content

### Error Propagation Test
1. Stop backend service
2. Try streaming from frontend
3. Should see graceful error message
4. Restart backend - should work again

## Integration Points

### SSE Format Validation
All streams should use Server-Sent Events format:
```
data: {"type": "content", "content": "text chunk"}\n\n
data: {"type": "done", "timestamp": 123456789}\n\n
```

### Headers Validation
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- CORS headers present

### Error Format
Errors should be in SSE format:
```
data: {"type": "error", "message": "Error description"}\n\n
```

## Success Criteria

- [ ] Backend streams chunks with realistic delays
- [ ] Edge worker proxies streams without buffering
- [ ] Frontend displays real-time streaming text
- [ ] CORS works across all layers
- [ ] Error handling works gracefully
- [ ] Abort/cancel functionality works
- [ ] Multiple concurrent streams supported

This completes the Phase 2.2 streaming pipeline prototype! 🚀