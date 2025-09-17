# JWT Authentication Setup Guide

This guide shows how to configure JWT signing keys for the Lemma Edge API.

## 🔑 JWT Algorithm Support

The Edge worker is optimized for **Supabase ES256** authentication:

### **ES256 (Default) - Supabase Standard**
- **Uses**: ECDSA with P-256 elliptic curve
- **Security**: More secure than HS256, smaller keys than RSA
- **Performance**: Fast verification, efficient
- **Supabase**: Standard algorithm after key rotation
- **Key Type**: Shared secret (NOT public/private keypair)

### **HS256 (Fallback) - Backward Compatibility**
- **Uses**: HMAC with SHA-256
- **Security**: Good for legacy systems
- **Performance**: Very fast verification
- **Use case**: Backward compatibility

## 🔑 Setup Options

### Option 1: ES256 (Recommended) - JWK File

**After Supabase Key Rotation:**
```bash
# 1. Get the JWK from Key Details in Supabase console
# 2. Update the JWK file at: edge/src/config/supabase-jwk.json

{
  "x": "6GKbCovh-yJGL9QoBFT3ThmoUtUNSSf3xJpzDErqh7s",
  "y": "3RLImt6Tng7TNwIdWHfEKhAJ_u2YdwooZKJ8KztPIBk", 
  "alg": "ES256",
  "crv": "P-256",
  "ext": true,
  "key_ops": ["verify"],
  "kty": "EC"
}

# 3. Clean wrangler.jsonc (no long strings needed!)
"vars": {
  "JWT_ALGORITHM": "ES256",
  "JWT_DISCOVERY_URL": "https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks"
}

# Benefits: ✅ Clean config ✅ Version controlled ✅ Easy to update
```

## 🎯 JWT Token Structure

### Required Claims
```json
{
  "sub": "user-id-123",           // Subject (user ID) - REQUIRED
  "email": "user@example.com",    // User email - REQUIRED  
  "role": "user",                 // User role - REQUIRED
  "iat": 1640995200,              // Issued at - REQUIRED
  "exp": 1640998800               // Expires at - REQUIRED
}
```

### Optional Claims
```json
{
  "iss": "lemma-app",             // Issuer (your app name)
  "aud": "lemma-users",           // Audience (your users)
  "jti": "token-id-123",          // JWT ID (unique token identifier)
  "scope": "read write",          // Permissions/scopes
  "custom_claims": {              // Your custom data
    "subscription": "premium",
    "tenant_id": "org-456"
  }
}
```

## 🔨 Creating JWT Tokens

### Using Node.js (for testing)

```javascript
const jwt = require('jsonwebtoken');

const payload = {
  sub: 'user-123',
  email: 'test@example.com',
  role: 'user',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
};

const signingKey = 'your-secret-key-here';
const token = jwt.sign(payload, signingKey, { algorithm: 'HS256' });

console.log('JWT Token:', token);
```

### Using Python (for testing)

```python
import jwt
import time

payload = {
    'sub': 'user-123',
    'email': 'test@example.com', 
    'role': 'user',
    'iat': int(time.time()),
    'exp': int(time.time()) + 3600  # 1 hour
}

signing_key = 'your-secret-key-here'
token = jwt.encode(payload, signing_key, algorithm='HS256')

print(f'JWT Token: {token}')
```

### Using Online Tools (for testing only)

⚠️ **WARNING**: Only use for testing with dummy data. Never use real secrets on public websites.

1. Go to [jwt.io](https://jwt.io)
2. Select algorithm: HS256
3. Set your payload in the "PAYLOAD" section
4. Set your secret in the "VERIFY SIGNATURE" section
5. Copy the generated token

## 🧪 Testing JWT Authentication

### Test Token Validation
```bash
# Health check with JWT
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8787/health

# Expected response includes user info:
{
  "message": "Lemma Edge API",
  "status": "healthy", 
  "user": {
    "id": "user-123",
    "email": "test@example.com",
    "role": "user"
  }
}
```

### Test Protected Endpoints
```bash
# API call with authentication
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8787/api/v1/streaming/test

# Without token (should still work, but no user context)
curl http://localhost:8787/api/v1/streaming/test
```

## 🚨 Security Best Practices

### Signing Key Security
- **Use strong keys**: Minimum 256 bits (32 bytes)
- **Keep secret**: Never commit to version control
- **Rotate regularly**: Change keys periodically
- **Environment specific**: Different keys for dev/staging/prod

### Token Best Practices
- **Short expiration**: 1-24 hours for access tokens
- **Refresh tokens**: For longer sessions
- **Minimal claims**: Only include necessary data
- **Validate audience**: Check `aud` claim if using multiple apps

### Production Checklist
- [ ] Strong JWT signing key (32+ bytes)
- [ ] Key stored as Cloudflare Worker secret
- [ ] No secrets in code or logs
- [ ] Proper token expiration (1-24 hours)
- [ ] Error logging for auth failures
- [ ] Rate limiting enabled
- [ ] HTTPS only in production

## 🔍 Troubleshooting

### Common Issues

**"No JWT signing key configured"**
```bash
# Check if secret is set
wrangler secret list

# Set the secret
wrangler secret put JWT_SIGNING_KEY
```

**"JWT validation failed"**
- Check token expiration (`exp` claim)
- Verify signing key matches
- Ensure algorithm is HS256
- Check token format (should start with "Bearer ")

**"JWT missing required fields"**
- Token must include `sub` and `email` claims
- Check token payload structure

### Debug Logging

The Edge worker logs authentication attempts:

```javascript
// Success log
{
  "level": "info",
  "message": "User authenticated",
  "userId": "user-123",
  "email": "test@example.com",
  "role": "user",
  "requestId": "uuid"
}

// Failure log  
{
  "level": "warn",
  "message": "JWT authentication failed",
  "hasToken": true,
  "hasSigningKey": true,
  "requestId": "uuid"
}
```

## 🔗 Integration Examples

### Supabase Integration
```typescript
// Get Supabase session
const { data: { session } } = await supabase.auth.getSession();

// Use the access token
const response = await fetch('https://your-worker.workers.dev/api/v1/data', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
});
```

### Frontend Integration (React)
```typescript
// Store JWT in secure storage
const token = localStorage.getItem('jwt_token');

// API client with authentication
const apiClient = {
  get: (url: string) => fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }),
  
  // Add user context to requests
  getWithAuth: async (url: string) => {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
};
```

Your JWT authentication is now configured and ready for production! 🎉