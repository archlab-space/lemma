/**
 * Upload handlers for Lemma Edge API
 * Handles file upload operations including pre-signed URL generation for R2
 */

import { AwsClient } from 'aws4fetch'
import { RouteHandler } from '../types'

interface PresignedUrlRequest {
  fileName: string
  fileSize: number
  fileType: string
  userId: string
  storagePath?: string // Optional - use existing path from metadata
  fileId?: string // Optional - for retry uploads
  sanitizedFileName?: string // Optional - for retry uploads
}

export const generatePresignedUrlHandler: RouteHandler = async (request, context) => {
  const { env, user } = context

  // Require authentication
  if (!user) {
    return new Response(
      JSON.stringify({
        message: 'Authentication required',
        error_code: 'UNAUTHORIZED',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const body: PresignedUrlRequest = await request.json()
    const { fileName, fileSize, fileType, storagePath, fileId: providedFileId, sanitizedFileName: providedSanitizedFileName } = body

    // Validate request
    if (!fileName || !fileSize || !fileType) {
      return new Response(
        JSON.stringify({
          message: 'Missing required fields',
          error_code: 'INVALID_REQUEST',
          required_fields: ['fileName', 'fileSize', 'fileType'],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Must have either fileName (for new upload) or storagePath (for retry)
    if (providedFileId && (!storagePath || !providedSanitizedFileName)) {
      return new Response(
        JSON.stringify({
          message: 'Either fileName or storagePath is required',
          error_code: 'INVALID_REQUEST',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate file type
    if (fileType !== 'application/pdf') {
      return new Response(
        JSON.stringify({
          message: 'Only PDF files are allowed',
          error_code: 'INVALID_FILE_TYPE',
          allowed_types: ['application/pdf'],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (fileSize > maxSize) {
      return new Response(
        JSON.stringify({
          message: 'File size exceeds limit',
          error_code: 'FILE_TOO_LARGE',
          max_size_mb: 50,
          provided_size_mb: Math.round(fileSize / (1024 * 1024) * 100) / 100,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Use provided values or generate new ones
    let filePath: string
    let fileId: string
    let sanitizedFileName: string

    if (storagePath && providedFileId && providedSanitizedFileName) {
      // Use provided values for retry uploads (most reliable)
      filePath = storagePath
      fileId = providedFileId
      sanitizedFileName = providedSanitizedFileName
    } else {
      // Generate new path for fresh uploads
      fileId = crypto.randomUUID()
      const timestamp = new Date().toISOString().split('T')[0]
      sanitizedFileName = fileName!.replace(/[^a-zA-Z0-9.-]/g, '_')
      filePath = `documents/${user.id}/${timestamp}/${fileId}_${sanitizedFileName}`
    }

    // Check if R2 bucket binding is available
    if (!env.DOCUMENTS_BUCKET) {
      console.error('R2 bucket binding not configured')
      return new Response(
        JSON.stringify({
          message: 'Upload service not configured',
          error_code: 'SERVICE_UNAVAILABLE',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate R2 pre-signed URL using binding
    const uploadUrl = await generateR2PresignedUrl(filePath, fileType, context)
    
    // Validate the generated URL
    if (!uploadUrl || uploadUrl === 'undefined' || !uploadUrl.startsWith('https://')) {
      throw new Error('Invalid presigned URL generated')
    }

    return new Response(
      JSON.stringify({
        uploadUrl,
        fileId,
        filePath,
        sanitizedFileName,
        expiresIn: 3600, // 1 hour
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return new Response(
      JSON.stringify({
        message: 'Failed to generate upload URL',
        error_code: 'INTERNAL_ERROR',
        requestId: context.requestId,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Generate R2 pre-signed URL using AWS S3-compatible API
async function generateR2PresignedUrl(
  filePath: string, 
  contentType: string, 
  context: any
): Promise<string> {
  const { env } = context
  
  // Check if required environment variables are available
  
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID) {
    const missing = []
    if (!env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID')
    if (!env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY')
    if (!env.R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID')
    throw new Error(`R2 credentials not configured. Missing: ${missing.join(', ')}`)
  }
  
  try {
    // Create AWS client for R2
    const client = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    })

    // R2 bucket name from binding or environment
    const bucketName = 'lemma-documents' // This should match your wrangler.jsonc bucket_name
    const accountId = env.R2_ACCOUNT_ID

    // Construct R2 URL
    const baseUrl = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`
    const url = new URL(baseUrl)
    url.pathname = `/${filePath}`
    
    // Set expiry time (1 hour)
    url.searchParams.set('X-Amz-Expires', '3600')
    
    // Add content type restriction
    url.searchParams.set('X-Amz-Content-Type', contentType)

    // Sign the request
    const signed = await client.sign(
      new Request(url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
      }),
      {
        aws: { signQuery: true },
      }
    )
    
    return signed.url
    
  } catch (error) {
    console.error('Error generating R2 presigned URL:', error)
    throw new Error('Failed to generate presigned URL')
  }
}