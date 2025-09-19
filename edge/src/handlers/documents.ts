/**
 * Document handlers for Lemma Edge API
 * Proxies document operations to the backend service
 */

import { RouteHandler } from '../types'

// Check for duplicate document by file hash
export const checkDuplicateHandler: RouteHandler = async (request, context) => {
  const { user } = context
  if (!user) throw new Error('User not authenticated') // Should never happen due to requireAuth middleware

  try {
    // Forward the request to the backend with user info in headers
    const backendResponse = await fetch(
      `${context.env.BACKEND_URL}/api/v1/documents/check-duplicate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Secret': context.env.WORKER_SECRET,
          'X-User-ID': user.id,
          'X-User-Email': user.email,
          'X-User-Role': user.role,
          'X-Request-ID': context.requestId,
        },
        body: await request.text(),
      }
    )

    // Return the backend response as-is
    const result = await backendResponse.text()
    return new Response(result, {
      status: backendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error checking duplicate:', error)
    return new Response(JSON.stringify({ error: 'Failed to check duplicate' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const createDocumentHandler: RouteHandler = async (request, context) => {
  const { user } = context
  if (!user) throw new Error('User not authenticated') // Should never happen due to requireAuth middleware

  try {
    // Forward the request to the backend with user info in headers
    const backendResponse = await fetch(`${context.env.BACKEND_URL}/api/v1/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Worker-Secret': context.env.WORKER_SECRET,
        'X-User-ID': user.id,
        'X-User-Email': user.email,
        'X-User-Role': user.role,
        'X-Request-ID': context.requestId,
      },
      body: await request.text(),
    })

    // Return the backend response as-is
    const result = await backendResponse.text()
    return new Response(result, {
      status: backendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error creating document:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to create document',
        code: 'INTERNAL_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const getDocumentsHandler: RouteHandler = async (request, context) => {
  const { user } = context
  if (!user) throw new Error('User not authenticated') // Should never happen due to requireAuth middleware

  try {
    const url = new URL(request.url)
    
    // Forward the request to the backend with the same query parameters
    const backendResponse = await fetch(
      `${context.env.BACKEND_URL}/api/v1/documents${url.search}`,
      {
        headers: {
          'X-Worker-Secret': context.env.WORKER_SECRET,
          'X-User-ID': user.id,
          'X-User-Email': user.email,
          'X-User-Role': user.role,
          'X-Request-ID': context.requestId,
        },
      }
    )

    // Return the backend response as-is
    const result = await backendResponse.text()
    return new Response(result, {
      status: backendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error fetching documents:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch documents' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const getDocumentHandler: RouteHandler = async (request, context) => {
  const { user } = context
  if (!user) throw new Error('User not authenticated') // Should never happen due to requireAuth middleware

  try {
    const url = new URL(request.url)
    const documentId = url.pathname.split('/').pop()

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Forward the request to the backend
    const backendResponse = await fetch(
      `${context.env.BACKEND_URL}/api/v1/documents/${documentId}`,
      {
        headers: {
          'X-Worker-Secret': context.env.WORKER_SECRET,
          'X-User-ID': user.id,
          'X-User-Email': user.email,
          'X-User-Role': user.role,
          'X-Request-ID': context.requestId,
        },
      }
    )

    // Return the backend response as-is
    const result = await backendResponse.text()
    return new Response(result, {
      status: backendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error fetching document:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch document' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const deleteDocumentHandler: RouteHandler = async (request, context) => {
  const { user } = context
  if (!user) throw new Error('User not authenticated') // Should never happen due to requireAuth middleware

  try {
    const url = new URL(request.url)
    const documentId = url.pathname.split('/').pop()

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Forward the DELETE request to the backend
    const backendResponse = await fetch(
      `${context.env.BACKEND_URL}/api/v1/documents/${documentId}`,
      {
        method: 'DELETE',
        headers: {
          'X-Worker-Secret': context.env.WORKER_SECRET,
          'X-User-ID': user.id,
          'X-User-Email': user.email,
          'X-User-Role': user.role,
          'X-Request-ID': context.requestId,
        },
      }
    )

    // Return the backend response as-is
    const result = await backendResponse.text()
    return new Response(result, {
      status: backendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error deleting document:', error)
    return new Response(JSON.stringify({ error: 'Failed to delete document' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Update document processing status
export const updateDocumentStatusHandler: RouteHandler = async (request, context) => {
  const { user } = context
  if (!user) throw new Error('User not authenticated') // Should never happen due to requireAuth middleware

  try {
    const url = new URL(request.url)
    const documentId = url.pathname.split('/').slice(-2)[0] // Get ID from /documents/{id}/status

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Forward the PATCH request to the backend
    const backendResponse = await fetch(
      `${context.env.BACKEND_URL}/api/v1/documents/${documentId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Secret': context.env.WORKER_SECRET,
          'X-User-ID': user.id,
          'X-User-Email': user.email,
          'X-User-Role': user.role,
          'X-Request-ID': context.requestId,
        },
        body: await request.text(),
      }
    )

    // Return the backend response as-is
    const result = await backendResponse.text()
    return new Response(result, {
      status: backendResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error updating document status:', error)
    return new Response(JSON.stringify({ error: 'Failed to update document status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

