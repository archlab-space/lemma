# Lemma Edge API - Production Ready

This Cloudflare Worker provides a production-ready edge API layer with enterprise-grade features.

## 🚀 Features

### Core Architecture
- **itty-router**: Lightweight, battle-tested routing (~2KB)
- **Production JWT**: Secure token validation with `@tsndr/cloudflare-worker-jwt`
- **KV Rate Limiting**: Distributed rate limiting with Cloudflare KV
- **UUID Request IDs**: Collision-free request tracking with `crypto.randomUUID()`
- **Comprehensive Logging**: Request/response logging with metadata
- **CORS Support**: Full CORS handling for web applications

### Security & Performance
- **JWT Authentication**: Proper signature validation and expiration checking
- **Rate Limiting**: 
  - API endpoints: 100 requests per 15 minutes
  - Streaming endpoints: 10 requests per minute
- **Request Tracing**: UUID-based request IDs for debugging
- **Error Handling**: Graceful error propagation in SSE format

### Middleware Pipeline
1. **Logging Middleware**: Request tracking and performance monitoring
2. **CORS Middleware**: Cross-origin request handling
3. **Auth Middleware**: Optional JWT validation (non-blocking)
4. **Rate Limiting**: KV-based distributed rate limiting

## 📁 Project Structure

```
src/
├── types/           # TypeScript interfaces
├── middleware/      # Reusable middleware components
│   ├── cors.ts      # CORS handling
│   ├── auth.ts      # JWT authentication
│   ├── logging.ts   # Request/response logging
│   └── rateLimit.ts # KV-based rate limiting
├── handlers/        # Route handlers
│   ├── health.ts    # Health check endpoints
│   └── proxy.ts     # Backend proxy handlers
├── utils/           # Utility functions
│   └── proxy.ts     # Advanced proxy utilities
└── index.ts         # Main worker entry point
```

## 🔧 Configuration

### Environment Variables (wrangler.jsonc)
```jsonc
{
  "vars": {
    "SUPABASE_URL": "https://xxx.supabase.co",
    "SUPABASE_ANON_KEY": "eyJ...",
    "BACKEND_URL": "http://localhost:8000"
  },
  "kv_namespaces": [
    {
      "binding": "RATE_LIMIT_KV",
      "id": "rate_limit_namespace"
    }
  ],
  "r2_buckets": [
    {
      "binding": "DOCUMENTS_BUCKET", 
      "bucket_name": "lemma-documents"
    }
  ]
}
```

### Secrets (set via wrangler)
```bash
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put JWT_SIGNING_KEY  # Primary JWT signing key
wrangler secret put JWT_SECRET       # Fallback for backward compatibility
```

## 🛠 Development

### Prerequisites
- Node.js 18+
- pnpm
- Cloudflare account with Workers enabled

### Setup
```bash
# Install dependencies
pnpm install

# Generate TypeScript types
pnpm run cf-typegen

# Start development server
pnpm run dev

# Deploy to Cloudflare
pnpm run deploy
```

### Creating KV Namespace
```bash
# Create KV namespace for rate limiting
wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "RATE_LIMIT_KV" --preview

# Update wrangler.jsonc with the returned IDs
```

## 📡 API Endpoints

### Health Checks
- `GET /` - Edge worker health
- `GET /health` - Edge worker health  
- `GET /api/v1/health` - Backend health check

### Streaming Proxy
- `GET|POST /api/v1/streaming/*` - Streaming endpoints (10 req/min)

### General API Proxy
- `GET|POST|PUT|PATCH|DELETE /api/*` - All API endpoints (100 req/15min)

## 🔐 Authentication

### JWT Signing Key Configuration

The Edge worker supports JWT authentication using signing keys:

1. **Primary**: `JWT_SIGNING_KEY` - Main signing key for JWT validation
2. **Fallback**: `SUPABASE_SERVICE_KEY` - For Supabase integration
3. **Legacy**: `JWT_SECRET` - Backward compatibility

### JWT Token Format
```json
{
  "sub": "user-id",
  "email": "user@example.com", 
  "role": "user",
  "iat": 1234567890,
  "exp": 1234567890,
  "iss": "your-issuer",      // optional
  "aud": "your-audience"     // optional
}
```

### Supported Algorithms
- **ES256** (default): ECDSA with P-256 curve - Supabase standard, more secure
- **HS256** (fallback): HMAC with SHA-256 - backward compatibility

### Key Configuration
- **ES256**: `JWT_SIGNING_KEY` = Supabase JWT secret (keep private!)
- **HS256**: `JWT_SIGNING_KEY` = shared secret (keep private!)
- **Algorithm**: `JWT_ALGORITHM` = ES256 (default) | HS256 (fallback)

### Using Authentication
```bash
# Test with JWT token
curl -H "Authorization: Bearer <jwt-token>" \
     https://your-worker.workers.dev/api/v1/health

# Check authentication in response
# Authenticated requests will show user info in logs
```

### Authentication Flow
1. **Token Extraction**: Bearer token from Authorization header
2. **Signature Verification**: Using JWT signing key
3. **Expiration Check**: Automatic expiration validation  
4. **User Context**: Populates `context.user` for handlers
5. **Logging**: Logs authentication success/failure

## 📊 Rate Limiting

### Headers Included
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp of window reset

### Rate Limit Response (429)
```json
{
  "message": "Rate limit exceeded",
  "error_code": "RATE_LIMIT_EXCEEDED", 
  "retryAfter": 60,
  "requestId": "uuid"
}
```

## 🐛 Request Tracing

Every request gets a unique UUID for tracking:
- **Request ID Header**: `X-Request-ID` in responses
- **Logging**: All logs include request ID
- **Error Responses**: Include request ID for debugging

## 🌊 Streaming Support

Optimized for Server-Sent Events:
- **Error Propagation**: Errors returned as SSE events
- **Timeout Handling**: 60-second timeout for streaming
- **Connection Management**: Proper stream cleanup

### SSE Error Format
```
data: {"type": "error", "message": "Error description", "timestamp": 123}

```

## 📈 Monitoring

### Log Format
```json
{
  "level": "info",
  "message": "Request completed",
  "timestamp": "2024-01-01T00:00:00Z",
  "requestId": "uuid",
  "method": "GET",
  "path": "/api/v1/health",
  "status": 200,
  "duration": 150,
  "userId": "user-id"
}
```

### Production Monitoring
- **Console Logs**: Structured JSON logging
- **Request Tracing**: UUID-based request tracking
- **Performance**: Request duration tracking
- **Error Tracking**: Comprehensive error logging

## 🚀 Production Deployment

1. **Create KV Namespace**:
   ```bash
   wrangler kv:namespace create "RATE_LIMIT_KV"
   ```

2. **Set Secrets**:
   ```bash
   wrangler secret put SUPABASE_SERVICE_KEY
   wrangler secret put JWT_SIGNING_KEY    # Your JWT signing key
   wrangler secret put JWT_SECRET         # Optional fallback
   ```

3. **Deploy**:
   ```bash
   pnpm run deploy
   ```

4. **Configure Custom Domain** (optional):
   ```bash
   wrangler route add example.com/api/* lemma-edge-prod
   ```

## 🔄 Upgrade Benefits

| Feature | Before | After |
|---------|--------|-------|
| **JWT Validation** | Manual, unsafe | Library-based, secure |
| **Rate Limiting** | In-memory, non-persistent | KV-based, distributed |
| **Request IDs** | Random collisions possible | UUID, collision-free |
| **Router** | Custom, basic | itty-router, battle-tested |
| **Bundle Size** | Custom code | Optimized libraries |
| **Error Handling** | Basic | Production-grade |
| **Observability** | Limited | Comprehensive |

This edge layer is now production-ready with enterprise-grade features for security, performance, and observability! 🎉