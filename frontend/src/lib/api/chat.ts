/**
 * Chat API Service
 * Handles all chat and messaging related API operations
 */

import { apiClient } from './client'
import { 
  ChatMessage, 
  ChatSession, 
  ChatRequest, 
  SessionChatRequest,
  ConversationCreateRequest,
  ConversationResponse,
  ConversationListResponse,
  ConversationHistoryResponse,
  StreamingChatResponse,
  RequestConfig 
} from './types'

class ChatService {
  private basePath = '/api/v1/chat'

  /**
   * Create a new conversation
   */
  async createConversation(request: ConversationCreateRequest): Promise<ConversationResponse> {
    const response = await apiClient.post<ConversationResponse>(`${this.basePath}/conversations`, request)
    return response.data!
  }

  /**
   * Get all conversations for the user
   */
  async getConversations(options?: {
    page?: number
    page_size?: number
    document_id?: string
    status?: string
  }): Promise<ConversationListResponse> {
    const params = new URLSearchParams()
    
    if (options?.page) params.append('page', options.page.toString())
    if (options?.page_size) params.append('page_size', options.page_size.toString())
    if (options?.document_id) params.append('document_id', options.document_id)
    if (options?.status) params.append('status', options.status)

    const query = params.toString()
    const endpoint = `${this.basePath}/conversations${query ? `?${query}` : ''}`
    
    const response = await apiClient.get<ConversationListResponse>(endpoint)
    return response.data!
  }

  /**
   * Get a specific conversation with messages
   */
  async getConversation(conversationId: string, limit?: number): Promise<ConversationHistoryResponse> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())

    const query = params.toString()
    const endpoint = `${this.basePath}/conversations/${conversationId}${query ? `?${query}` : ''}`
    
    const response = await apiClient.get<ConversationHistoryResponse>(endpoint)
    return response.data!
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, permanent = false): Promise<{message: string}> {
    const params = new URLSearchParams()
    if (permanent) params.append('permanent', 'true')

    const query = params.toString()
    const endpoint = `${this.basePath}/conversations/${conversationId}${query ? `?${query}` : ''}`
    
    const response = await apiClient.delete<{message: string}>(endpoint)
    return response.data!
  }

  /**
   * Send a message in a session and get streaming response
   */
  async sendSessionMessage(
    sessionId: string,
    request: SessionChatRequest,
    onChunk: (chunk: string) => void,
    onComplete?: (response: StreamingChatResponse) => void,
    onError?: (error: Error) => void,
    signal?: AbortSignal
  ): Promise<void> {
    let accumulatedContent = ''
    const messageData: Partial<StreamingChatResponse> = {}

    try {
      await apiClient.stream(
        `${this.basePath}/sessions/${sessionId}/ask`,
        request,
        (chunk: string) => {
          try {
            // Try to parse as JSON first (for structured responses)
            const parsed = JSON.parse(chunk)
            
            // Update message data
            Object.assign(messageData, parsed)
            
            if (parsed.content) {
              accumulatedContent += parsed.content
              onChunk(parsed.content)
            }
            
            if (parsed.status === 'completed' && onComplete) {
              onComplete({
                ...messageData,
                content: accumulatedContent,
              } as StreamingChatResponse)
            }
          } catch {
            // If not JSON, treat as plain text
            accumulatedContent += chunk
            onChunk(chunk)
          }
        },
        { signal }
      )
    } catch (error) {
      onError?.(error as Error)
    }
  }

  /**
   * Send a message without session context (streaming)
   */
  async sendMessage(
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    onComplete?: (response: StreamingChatResponse) => void,
    onError?: (error: Error) => void,
    signal?: AbortSignal
  ): Promise<void> {
    let accumulatedContent = ''
    const messageData: Partial<StreamingChatResponse> = {}

    try {
      await apiClient.stream(
        `${this.basePath}/ask`,
        request,
        (chunk: string) => {
          try {
            const parsed = JSON.parse(chunk)
            
            Object.assign(messageData, parsed)
            
            if (parsed.content) {
              accumulatedContent += parsed.content
              onChunk(parsed.content)
            }
            
            if (parsed.status === 'completed' && onComplete) {
              onComplete({
                ...messageData,
                content: accumulatedContent,
              } as StreamingChatResponse)
            }
          } catch {
            accumulatedContent += chunk
            onChunk(chunk)
          }
        },
        { signal }
      )
    } catch (error) {
      onError?.(error as Error)
    }
  }

  /**
   * Send a synchronous message (non-streaming)
   */
  async sendMessageSync(
    request: ChatRequest & { include_quality?: boolean }
  ): Promise<{
    answer: string
    document_id?: string
    sources_used: string[]
    processing_time_ms: number
    quality_assessment?: unknown
  }> {
    const response = await apiClient.post<{
      answer: string
      document_id?: string
      sources_used: string[]
      processing_time_ms: number
      quality_assessment?: unknown
    }>(`${this.basePath}/ask-sync`, request)
    return response.data!
  }

  /**
   * Get document summary
   */
  async getDocumentSummary(documentId: string): Promise<{
    summary: string
    document_id: string
    processing_time_ms: number
  }> {
    const response = await apiClient.post<{
      summary: string
      document_id: string
      processing_time_ms: number
    }>(`${this.basePath}/summary`, { document_id: documentId })
    return response.data!
  }

  /**
   * Get suggested questions for a document
   */
  async getSuggestedQuestions(documentId: string): Promise<{
    questions: string[]
    document_id: string
  }> {
    const response = await apiClient.post<{
      questions: string[]
      document_id: string
    }>(`${this.basePath}/suggest-questions`, { document_id: documentId })
    return response.data!
  }

  /**
   * Submit message feedback
   */
  async submitFeedback(
    messageId: string,
    rating?: number,
    feedback?: string,
    isHelpful?: boolean
  ): Promise<{message: string}> {
    const response = await apiClient.post<{message: string}>(`${this.basePath}/feedback`, {
      message_id: messageId,
      rating,
      feedback,
      is_helpful: isHelpful
    })
    return response.data!
  }

  /**
   * Chat health check
   */
  async healthCheck(): Promise<{
    status: string
    service: string
    rag_service_available: boolean
  }> {
    const response = await apiClient.get<{
      status: string
      service: string
      rag_service_available: boolean
    }>(`${this.basePath}/health`)
    return response.data!
  }
}

export const chatService = new ChatService()
export default chatService