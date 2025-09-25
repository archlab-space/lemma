/**
 * Documents API Service
 * Handles all document-related API operations
 */

import { apiClient } from './client'
import { 
  Document, 
  DocumentUploadRequest, 
  DocumentProcessingStatus,
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
  async checkDuplicate(fileHash: string): Promise<unknown> {
    const response = await apiClient.post<unknown>(
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
   * Upload file to the provided URL (for direct R2 uploads)
   */
  async uploadFile(
    uploadUrl: string,
    file: File,
    fields?: Record<string, string>,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<void> {
    return apiClient.upload(uploadUrl, file, fields, onProgress, signal)
  }
}

export const documentsService = new DocumentsService()
export default documentsService