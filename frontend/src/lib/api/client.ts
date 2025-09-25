/**
 * API Client Base
 * Core HTTP client with authentication and error handling
 */

import { supabase } from '@/lib/supabase'
import { ApiResponse, ApiError, RequestConfig } from './types'

class ApiClient {
  private baseUrl: string

  constructor() {
    // Edge API base URL - update based on environment
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.lemma.ai' 
      : 'http://localhost:8787'
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('🚨 API Client: Error getting session:', error)
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
      console.log('🔑 API Client: Using auth token for request')
    } else {
      console.warn('⚠️ API Client: No auth token available')
    }
    
    return headers
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    let data: unknown
    try {
      data = isJson ? await response.json() : await response.text()
    } catch {
      throw new Error('Failed to parse response')
    }

    if (!response.ok) {
      const errorData = data as Record<string, unknown>
      const error: ApiError = {
        code: (errorData?.code as string) || 'API_ERROR',
        message: (errorData?.message as string) || `HTTP ${response.status}: ${response.statusText}`,
        details: errorData?.details as Record<string, unknown>,
        timestamp: new Date().toISOString()
      }
      throw error
    }

    const responseData = data as Record<string, unknown>
    return {
      data: data as T,
      status: response.status,
      message: responseData?.message as string
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const { timeout = 30000, retries = 3, signal, headers: configHeaders } = config
    
    const authHeaders = await this.getAuthHeaders()
    const headers = {
      ...authHeaders,
      ...configHeaders,
      ...options.headers
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const requestSignal = signal || controller.signal

    let lastError: Error | undefined
    let response: Response | undefined

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
          signal: requestSignal
        })

        clearTimeout(timeoutId)
        return await this.handleResponse<T>(response)
      } catch (error) {
        lastError = error as Error
        
        // Don't retry for these error types
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Request aborted')
        }
        
        if (response && response.status >= 400 && response.status < 500) {
          throw error
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    clearTimeout(timeoutId)
    throw lastError || new Error('Max retries exceeded')
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' }, config)
  }

  async post<T>(
    endpoint: string, 
    data?: unknown, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
      },
      config
    )
  }

  async put<T>(
    endpoint: string, 
    data?: unknown, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined
      },
      config
    )
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' }, config)
  }

  async patch<T>(
    endpoint: string, 
    data?: unknown, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined
      },
      config
    )
  }

  async upload(
    url: string,
    file: File,
    fields?: Record<string, string>,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      
      // Add any additional fields (for signed uploads)
      if (fields) {
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value)
        })
      }
      
      formData.append('file', file)

      const xhr = new XMLHttpRequest()

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100
            onProgress(progress)
          }
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`))
        }
      }

      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.onabort = () => reject(new Error('Upload aborted'))

      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort()
        })
      }

      xhr.open('POST', url)
      xhr.send(formData)
    })
  }

  async stream(
    endpoint: string,
    data: unknown,
    onChunk: (chunk: string) => void,
    config?: RequestConfig
  ): Promise<void> {
    const authHeaders = await this.getAuthHeaders()
    const headers = {
      ...authHeaders,
      ...config?.headers
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: config?.signal
    })

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        
        // Handle Server-Sent Events format
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data && data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data)
                onChunk(parsed.content || parsed.delta || '')
              } catch {
                // If not JSON, treat as plain text
                onChunk(data)
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // Helper method to check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session?.access_token
  }

  // Get current user from Supabase
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }
}

export const apiClient = new ApiClient()
export default apiClient