# Streaming Pipeline Test Guide

This guide helps you test the end-to-end streaming pipeline across all three layers:
1. **Backend (FastAPI)** - Generates streaming responses
2. **Edge (Cloudflare Worker)** - Proxies streams with error handling  
3. **Frontend (Next.js)** - Consumes streams with React components

## Quick Test Setup

### 1. Start Backend (Terminal 1)
```bash
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Edge Worker (Terminal 2) 
```bash
cd edge
pnpm dev
# Worker will be available at http://localhost:8787
```

### 3. Start Frontend (Terminal 3)
```bash
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
```

## Expected Behaviors

### ✅ Working Pipeline
- **Backend**: Streams JSON data chunks with delays
- **Edge**: Proxies stream seamlessly with CORS headers
- **Frontend**: Displays streaming text with typing effect
- **Error Handling**: Graceful error messages in SSE format

### 🔧 Troubleshooting

**Backend not starting?**
```bash
cd backend
uv sync  # Install dependencies first
```

**Edge worker errors?**
```bash
cd edge
pnpm install  # Install dependencies
# Check wrangler.jsonc configuration
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