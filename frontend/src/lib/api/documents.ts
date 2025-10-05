/**
 * Documents API Service
 * Handles all document-related API operations
 */

import { apiClient } from './client'
import { 
  Document, 
  DocumentUploadRequest, 
  DocumentUploadResponse,
  DocumentProcessingStatus,
  DuplicateCheckResponse,
  PaginatedResponse,
  RequestConfig 
} from './types'

class DocumentsService {
  private basePath = '/api/v1/documents'

  /**
   * Get all user documents with optional pagination and filtering
   */
  async getDocuments(options?: {
    page?: number
    limit?: number
    status?: Document['processingStatus']
    search?: string
  }): Promise<PaginatedResponse<Document>> {
    const params = new URLSearchParams()
    
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.status) params.append('status', options.status)
    if (options?.search) params.append('search', options.search)

    const query = params.toString()
    const endpoint = `${this.basePath}${query ? `?${query}` : ''}`
    
    const response = await apiClient.get<{documents: Document[], pagination: { page: number; limit: number; total: number; totalPages: number }}>(endpoint)
    return {
      data: response.data!.documents,
      pagination: {
        page: response.data!.pagination.page,
        limit: response.data!.pagination.limit,
        total: response.data!.pagination.total,
        totalPages: response.data!.pagination.totalPages
      },
      status: response.status
    }
  }

  /**
   * Get a specific document by ID
   */
  async getDocument(documentId: string): Promise<Document> {
    const response = await apiClient.get<Document>(`${this.basePath}/${documentId}`)
    return response.data!
  }

  /**
   * Check for duplicate document by hash
   */
  async checkDuplicate(fileHash: string): Promise<DuplicateCheckResponse> {
    const response = await apiClient.post<DuplicateCheckResponse>(
      `${this.basePath}/check-duplicate`,
      { fileHash }
    )
    return response.data!
  }

  /**
   * Create a new document record
   */
  async createDocument(request: DocumentUploadRequest): Promise<{document: Document}> {
    const response = await apiClient.post<{document: Document}>(
      this.basePath,
      request
    )
    return response.data!
  }

  /**
   * Update document processing status
   */
  async updateProcessingStatus(
    documentId: string, 
    status: Document['processingStatus'],
    error?: string
  ): Promise<DocumentProcessingStatus> {
    const response = await apiClient.patch<DocumentProcessingStatus>(
      `${this.basePath}/${documentId}/status`,
      { processingStatus: status, processingError: error }
    )
    return response.data!
  }

  /**
   * Trigger document processing
   */
  async triggerProcessing(documentId: string): Promise<{message: string, documentId: string, status: string}> {
    const response = await apiClient.post<{message: string, documentId: string, status: string}>(
      `${this.basePath}/${documentId}/process`
    )
    return response.data!
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<{message: string, documentId: string}> {
    const response = await apiClient.delete<{message: string, documentId: string}>(`${this.basePath}/${documentId}`)
    return response.data!
  }

  /**
   * Request upload URL for document
   */
  async requestUpload(request: DocumentUploadRequest): Promise<DocumentUploadResponse> {
    const response = await apiClient.post<DocumentUploadResponse>(
      '/api/v1/upload/presigned-url',
      request
    )
    return response.data!
  }

  /**
   * Upload file to the provided URL (for direct R2 uploads)
   */
  async uploadFile(
    uploadUrl: string,
    file: File,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<void> {
    return apiClient.upload(uploadUrl, file, onProgress, signal)
  }


  /**
   * Poll processing status with callbacks
   */
  pollProcessingStatus(
    documentId: string,
    onProgress: (status: DocumentProcessingStatus) => void,
    onComplete: (document: Document) => void,
    onError: (error: Error) => void,
    intervalMs: number = 2000
  ): () => void {
    let cancelled = false
    
    const poll = async () => {
      if (cancelled) return
      
      try {
        const document = await this.getDocument(documentId)
        
        if (cancelled) return
        
        const status: DocumentProcessingStatus = {
          id: document.id,
          processingStatus: document.processingStatus,
          processingError: document.processingError,
          processingStartedAt: document.processingStartedAt,
          processingCompletedAt: document.processingCompletedAt,
          updatedAt: document.updatedAt
        }
        
        // Add progress calculation based on status
        const statusWithProgress = {
          ...status,
          progress: document.processingStatus === 'completed' ? 1 : 
                   document.processingStatus === 'processing' ? 0.5 : 
                   document.processingStatus === 'failed' ? 0 : 0
        }
        
        onProgress(statusWithProgress)
        
        if (document.processingStatus === 'completed') {
          onComplete(document)
          return
        }
        
        if (document.processingStatus === 'failed') {
          onError(new Error(document.processingError || 'Processing failed'))
          return
        }
        
        // Continue polling
        setTimeout(poll, intervalMs)
        
      } catch (error) {
        if (!cancelled) {
          onError(error instanceof Error ? error : new Error('Polling failed'))
        }
      }
    }
    
    // Start polling
    poll()
    
    // Return cancel function
    return () => {
      cancelled = true
    }
  }
}

export const documentsService = new DocumentsService()
export default documentsService