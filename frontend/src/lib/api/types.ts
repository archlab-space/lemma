/**
 * API Types and Interfaces
 * Shared types for API communication
 */

// Base API Response structure
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  status: number
}

// Pagination
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DocumentOutline {
  title: string,
  level: number,
  type: string
}

// Document Types
export interface Document {
  documentId: string
  userId: string
  filename: string
  originalFilename: string
  fileSizeBytes: number
  fileHash: string
  mimeType: string
  storagePath: string
  storageBucket?: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingError?: string
  processingStartedAt?: string
  processingCompletedAt?: string
  createdAt: string
  updatedAt: string
  title?: string
  authors?: string[]
  abstract?: string
  doi?: string
  publicationYear?: number
  journal?: string
  keywords?: string[]
  totalPages?: number
  totalWords?: number
  totalChunks?: number
  outline?: DocumentOutline
  language?: string
}

export interface DocumentUploadRequest {
  documentId?: string
  filename: string
  fileSize: number
  fileType: string
  originalFilename?: string
  fileSizeBytes?: number
  fileHash?: string
  mimeType?: string
  storagePath?: string
  title?: string
  authors?: string[]
  abstract?: string
  doi?: string
  publicationYear?: number
  journal?: string
  keywords?: string[]
}

export interface DocumentUploadResponse {
  uploadUrl: string
  documentId: string
  storagePath: string
  sanitizedFileName: string
}

export interface DocumentProcessingStatus {
  id: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingError?: string
  processingStartedAt?: string
  processingCompletedAt?: string
  updatedAt?: string
  progress?: number
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface DuplicateCheckResponse {
  isDuplicate: boolean
  existingDocument?: Document
}

// Upload UI Types
export interface UploadingFile {
  id: string
  name: string
  size: number
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  file?: File
  documentId?: string
}

// Chat Types (aligned with database schema)
export interface ChatMessage {
  id: string
  conversationId: string
  userId: string
  content: string
  role: 'user' | 'assistant' | 'system'
  sequenceNumber: number
  tokenCount?: number
  retrievedChunks?: string[]
  chunksUsedCount: number
  retrievalQuery?: string
  retrievalScore?: number
  modelUsed?: string
  processingTimeMs?: number
  retrievalTimeMs?: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'edited'
  userRating?: number
  userFeedback?: string
  isHelpful?: boolean
  createdAt: string
  completedAt?: string
}



export interface ChatRequest {
  question: string
  document_id?: string
  max_chunks?: number
  min_similarity?: number
}

export interface SessionChatRequest {
  question: string
}

export interface ConversationCreateRequest {
  document_id: string
  title?: string
  description?: string
  model_used?: string
  temperature?: number
  max_tokens?: number
  context_window_size?: number
}

export interface StreamingChatResponse {
  id: string
  session_id: string
  user_id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  sequence_number: number
  token_count?: number
  retrieved_chunks?: string[]
  chunks_used_count: number
  retrieval_query?: string
  retrieval_score?: number
  model_used?: string
  processing_time_ms?: number
  retrieval_time_ms?: number
  status: string
  user_rating?: number
  user_feedback?: string
  is_helpful?: boolean
  created_at: string
  completed_at?: string
}

// Search Types
export interface SearchRequest {
  query: string
  documentId?: string
  sessionId?: string
  limit?: number
  filters?: {
    role?: 'user' | 'assistant'
    dateRange?: {
      start: string
      end: string
    }
  }
}

export interface ChatConversation {
  id: string
  userId: string
  documentId: string
  title: string
  description?: string
  status: 'active' | 'archived' | 'deleted'
  messageCount: number
  totalTokensUsed: number
  lastMessageAt?: string
  modelUsed?: string
  temperature: number
  maxTokens: number
  contextWindowSize: number
  createdAt: string
  updatedAt: string
}

export interface ConversationListResponse {
  conversations: ChatConversation[]
  total_count: number
  page: number
  page_size: number
}

export interface ConversationHistoryResponse {
  conversation: ChatConversation
  messages: ChatMessage[]
}

export interface DocumentSearchResult {
  page: number
  section: string
  content: string
  highlights: string[]
  score: number
}

// User Types
export interface User {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
  settings?: {
    theme?: 'light' | 'dark'
    language?: string
    notifications?: boolean
  }
}

export interface UserStats {
  documentsCount: number
  sessionsCount: number
  messagesCount: number
  storageUsed: number
  storageLimit: number
}

// Error Types
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
}

// Request Configuration
export interface RequestConfig {
  timeout?: number
  retries?: number
  signal?: AbortSignal
  headers?: Record<string, string>
}

// Streaming Types
export interface StreamingOptions {
  onChunk?: (chunk: string) => void
  onComplete?: (response: StreamingChatResponse) => void
  onError?: (error: ApiError) => void
  signal?: AbortSignal
}