/**
 * Chat API Service
 * Handles all chat and messaging related API operations
 */

import { apiClient } from './client'
import { 
  ChatRequest, 
  SessionChatRequest,
  ConversationCreateRequest,
  ChatConversation,
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
  async createConversation(request: ConversationCreateRequest): Promise<ChatConversation> {
    const response = await apiClient.post<ChatConversation>(`${this.basePath}/conversations`, request)
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
   * Send a message in a conversation and get streaming response
   */
  async sendConversationMessage(
    conversationId: string,
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
        `${this.basePath}/sessions/${conversationId}/ask`,
        request,
        (chunk: string | Record<string, unknown>) => {
          // Handle structured JSON responses
          if (typeof chunk === 'object' && chunk !== null) {
            const parsed = chunk as Record<string, unknown>
            // Check for completion signal
            if (parsed.status === 'completed') {
              // This is the final message with full metadata
              if (onComplete) {
                onComplete({
                  id: parsed.id as string,
                  session_id: parsed.session_id as string,
                  user_id: parsed.user_id as string,
                  role: 'assistant',
                  content: parsed.content as string,
                  sequence_number: parsed.sequence_number as number,
                  token_count: parsed.token_count as number,
                  retrieved_chunks: parsed.retrieved_chunks as string[],
                  chunks_used_count: parsed.chunks_used_count as number,
                  retrieval_query: parsed.retrieval_query as string,
                  retrieval_score: parsed.retrieval_score as number,
                  model_used: parsed.model_used as string,
                  processing_time_ms: parsed.processing_time_ms as number,
                  retrieval_time_ms: parsed.retrieval_time_ms as number,
                  created_at: parsed.created_at as string,
                  completed_at: parsed.completed_at as string,
                  status: 'completed',
                  user_rating: parsed.user_rating as number | undefined,
                  user_feedback: parsed.user_feedback as string | undefined,
                  is_helpful: parsed.is_helpful as boolean | undefined
                })
              }
              return
            }

            // Check for error status
            if (parsed.status === 'error' && parsed.content) {
              onError?.(new Error(parsed.content as string))
              return
            }

            // Regular content chunk
            if (parsed.content) {
              const content = parsed.content as string
              accumulatedContent += content
              onChunk(content)
            }
          } else if (typeof chunk === 'string') {
            // Fallback for plain text chunks
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