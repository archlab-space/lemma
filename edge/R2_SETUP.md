# Cloudflare R2 Setup for Lemma

This document outlines how to configure Cloudflare R2 for secure file uploads in the Lemma Edge Worker.

## R2 Bucket Configuration

### 1. Create R2 Bucket
```bash
# Create bucket using Wrangler CLI
wrangler r2 bucket create lemma-documents

# Or create via Cloudflare Dashboard:
# 1. Go to R2 Object Storage in Cloudflare Dashboard
# 2. Click "Create bucket"
# 3. Name: lemma-documents
# 4. Location: Automatic (recommended)
```

### 2. Configure Bucket Binding

Add the following to `wrangler.toml`:

```toml
# R2 Bucket bindings
[[r2_buckets]]
binding = "DOCUMENTS_BUCKET"
bucket_name = "lemma-documents"
preview_bucket_name = "lemma-documents-preview" # Optional: separate bucket for dev
```

## Required Secrets & Environment Variables

### 1. R2 API Credentials

Create R2 API tokens for presigned URL generation:

1. Go to **Cloudflare Dashboard** > **R2 Object Storage** > **Manage R2 API tokens**
2. Click **Create API token**
3. Configure permissions:
   - **Permissions**: Custom
   - **Object read**: Allow
   - **Object write**: Allow  
   - **Bucket**: `lemma-documents` (or your bucket name)
4. Copy the **Access Key ID** and **Secret Access Key**

### 2. Set Worker Secrets

```bash
# Set R2 credentials as Worker secrets (recommended for security)
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY

# R2 Account ID can be set in wrangler.jsonc (non-sensitive)
# Get from your R2 dashboard S3 API URL: https://b49337c8c317194c858bde1373b9aac3.r2.cloudflarerestorage.com/
# Account ID is: b49337c8c317194c858bde1373b9aac3
```

Add to `wrangler.jsonc`:
```toml
"vars": {
  "R2_ACCOUNT_ID": "your-account-id-from-s3-api-url"
}
```

## Bucket Permissions & CORS

### 1. CORS Configuration
Configure CORS for browser uploads:

```json
{
  "corsRules": [
    {
      "allowedOrigins": ["https://lemma.app", "http://localhost:3000"],
      "allowedMethods": ["PUT", "POST"],
      "allowedHeaders": ["*"],
      "maxAgeSeconds": 3600
    }
  ]
}
```

### 2. Public Access (Optional)
For serving uploaded files publicly:

```bash
# Enable public access
wrangler r2 bucket cors set lemma-documents --file cors.json

# Or via Dashboard:
# 1. Go to R2 bucket settings
# 2. Enable "Public URL access"
# 3. Configure custom domain if needed
```

## File Upload Flow

### 1. Pre-signed URL Generation
```typescript
// Edge Worker generates secure upload URL using aws4fetch
import { AwsClient } from 'aws4fetch'

const client = new AwsClient({
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
})

const url = new URL(`https://lemma-documents.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`)
url.pathname = `/${storagePath}`
url.searchParams.set('X-Amz-Expires', '3600') // 1 hour

const signed = await client.sign(new Request(url, { method: 'PUT' }), {
  aws: { signQuery: true },
})
```

### 2. Client Upload
```typescript
// Frontend uploads directly to R2
const response = await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': 'application/pdf'
  }
})
```

### 3. File Access
```typescript
// Public URL for accessing files
const publicUrl = `https://pub-${accountId}.r2.dev/${storagePath}`
// Or with custom domain:
const customUrl = `https://files.lemma.app/${storagePath}`
```

## Security Considerations

### 1. File Path Structure
```
documents/
├── {userId}/
│   ├── {date}/
│   │   ├── {documentId}_{sanitizedName}.pdf
│   │   └── {documentId}_{sanitizedName}.pdf
│   └── {date}/
└── {userId}/
```

### 2. Access Control
- Pre-signed URLs expire in 1 hour
- Only authenticated users can generate upload URLs
- File paths include user ID for isolation
- Content-Type restricted to `application/pdf`
- File size limited to 50MB

### 3. Rate Limiting
- Upload endpoint has rate limiting applied
- Prevents abuse and DoS attacks
- Configurable limits per user/IP

## Monitoring & Costs

### 1. R2 Pricing (as of 2024)
- Storage: $0.015/GB-month
- Class A operations (PUT): $4.50/million
- Class B operations (GET): $0.36/million
- Data transfer: Free within Cloudflare

### 2. Monitoring
```bash
# Check bucket usage
wrangler r2 bucket list
wrangler r2 object list lemma-documents

# Monitor via Dashboard:
# 1. R2 Analytics
# 2. Usage metrics
# 3. Cost tracking
```

## Development vs Production

### Development
```toml
# wrangler.toml
[[r2_buckets]]
binding = "DOCUMENTS_BUCKET"
bucket_name = "lemma-documents-dev"
```

### Production
```toml
# wrangler.toml
[[r2_buckets]]
binding = "DOCUMENTS_BUCKET"
bucket_name = "lemma-documents"
```

## Troubleshooting

### Common Issues
1. **"R2 bucket binding not configured"**
   - Check `wrangler.toml` has correct binding
   - Verify bucket exists: `wrangler r2 bucket list`

2. **CORS errors during upload**
   - Configure CORS rules for your domain
   - Check allowed origins match your frontend URL

3. **Public URL not accessible**
   - Enable public access on bucket
   
### Debug Commands
```bash
# Test bucket access
wrangler r2 object put lemma-documents/test.txt --file test.txt

# Check CORS configuration
wrangler r2 bucket cors get lemma-documents

# List objects
wrangler r2 object list lemma-documents --prefix "documents/"
```

## Next Steps

After R2 setup is complete:
1. Deploy Edge Worker with R2 bindings
2. Test file upload flow end-to-end
3. Configure custom domain for file serving (optional)
4. Set up monitoring and alerting
5. Implement file cleanup policies for deleted documents