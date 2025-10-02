'use client'

/**
 * Integrated Streaming Chat Component
 * Uses real API endpoints for document-based chat with streaming responses
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { chatService } from '@/lib/api'
import { ChatMessage, ChatConversation, StreamingChatResponse } from '@/lib/api/types'
import { Card, CardContent, Button, Input, Badge } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { ErrorMessage } from '@/components/error'
import ChatMessageComponent from './ChatMessage'
import TypingIndicator from './TypingIndicator'

interface StreamingChatIntegratedProps {
  documentId: string
  conversationId: string
  initialMessages?: ChatMessage[]
  onMessageSent?: (message: ChatMessage) => void
  onMessageReceived?: (message: ChatMessage) => void
  onError?: (error: string) => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  className?: string
}

const StreamingChatIntegrated: React.FC<StreamingChatIntegratedProps> = ({
  documentId,
  conversationId,
  initialMessages = [],
  onMessageSent,
  onMessageReceived,
  onError,
  placeholder = "Ask a question about this document...",
  maxLength = 500,
  disabled = false,
  className = ''
}) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId)
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const pendingMessageRef = useRef<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update messages when initialMessages changes
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const submitMessage = async () => {
    if (!user || !inputValue.trim() || isStreaming || disabled) return

    const messageContent = inputValue.trim()
    setInputValue('')
    setError(null)
    
    // Generate unique ID for tracking this message
    const messageId = crypto.randomUUID()
    pendingMessageRef.current = messageId
    
    // Create user message - sessionId will be updated after session creation if needed
    const userMessage: ChatMessage = {
      id: messageId,
      conversationId: conversationId,
      userId: user.id,
      content: messageContent,
      role: 'user',
      sequenceNumber: messages.length + 1,
      chunksUsedCount: 0,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    onMessageSent?.(userMessage)

    // Start streaming response
    setIsStreaming(true)
    setStreamingContent('')

    // Clean up previous abort controller and create new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      // Send message to existing conversation
      await chatService.sendConversationMessage(
        conversationId,
        {
          question: messageContent
        },
        (chunk: string) => {
          setStreamingContent(prev => prev + chunk)
        },
        (response: StreamingChatResponse) => {
          // Response completed
          const assistantMessage: ChatMessage = {
            id: response.id,
            conversationId: response.session_id,
            userId: response.user_id,
            content: response.content,
            role: 'assistant',
            sequenceNumber: response.sequence_number,
            tokenCount: response.token_count,
            retrievedChunks: response.retrieved_chunks,
            chunksUsedCount: response.chunks_used_count,
            retrievalQuery: response.retrieval_query,
            retrievalScore: response.retrieval_score,
            modelUsed: response.model_used,
            processingTimeMs: response.processing_time_ms,
            retrievalTimeMs: response.retrieval_time_ms,
            status: 'completed',
            userRating: response.user_rating,
            userFeedback: response.user_feedback,
            isHelpful: response.is_helpful,
            createdAt: response.created_at,
            completedAt: response.completed_at
          }

          setMessages(prev => [...prev, assistantMessage])
          onMessageReceived?.(assistantMessage)
          setIsStreaming(false)
          setStreamingContent('')
          pendingMessageRef.current = null
        },
        (error: Error) => {
          setError(error.message)
          onError?.(error.message)
          setIsStreaming(false)
          setStreamingContent('')
          
          // Remove the pending user message on error
          if (pendingMessageRef.current) {
            setMessages(prev => prev.filter(msg => msg.id !== pendingMessageRef.current))
            pendingMessageRef.current = null
          }
        },
        abortControllerRef.current.signal
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      onError?.(errorMessage)
      setIsStreaming(false)
      setStreamingContent('')
      
      // Remove the pending user message on error
      if (pendingMessageRef.current) {
        setMessages(prev => prev.filter(msg => msg.id !== pendingMessageRef.current))
        pendingMessageRef.current = null
      }
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setStreamingContent('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitMessage()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setInputValue(value)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [inputValue])

  if (!user) {
    return (
      <Card variant="outlined" className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please sign in to start a conversation.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="outlined" className={className}>
      <CardContent className="p-0">
        <div className="flex flex-col h-full">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading conversation...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start a Conversation</h3>
                <p className="text-gray-500">
                  Ask questions about this document and get AI-powered answers with sources.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessageComponent
                    key={message.id}
                    message={{
                      id: message.id,
                      content: message.content,
                      role: message.role === 'system' ? 'assistant' : message.role,
                      timestamp: new Date(message.createdAt),
                      status: message.status === 'completed' ? 'sent' : message.status === 'pending' ? 'sending' : 'error',
                      sources: message.retrievedChunks?.map((chunk, index) => ({
                        page: index + 1,
                        section: `Chunk ${index + 1}`,
                        content: chunk
                      })),
                      metadata: {
                        model: message.modelUsed,
                        tokens: message.tokenCount,
                        processingTime: message.processingTimeMs
                      }
                    }}
                    onSourceClick={(page) => console.log('Navigate to page:', page)}
                    showMetadata={true}
                  />
                ))}
                
                {/* Streaming Message */}
                {isStreaming && streamingContent && (
                  <div className="relative">
                    <ChatMessageComponent
                      message={{
                        id: 'streaming',
                        content: streamingContent,
                        role: 'assistant',
                        timestamp: new Date(),
                        status: 'sending'
                      }}
                      isStreaming={true}
                      showMetadata={false}
                    />
                    <TypingIndicator className="absolute bottom-2 right-2" />
                  </div>
                )}

                {/* Typing Indicator */}
                {isStreaming && !streamingContent && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-4 pb-2">
              <ErrorMessage 
                message={error} 
                onDismiss={() => setError(null)}
              />
            </div>
          )}

          {/* Input Area */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder}
                  disabled={disabled || isStreaming}
                  rows={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-30"
                />
                
                {/* Character Count */}
                <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                  <span></span>
                  <span>{inputValue.length}/{maxLength}</span>
                </div>
              </div>

              {isStreaming ? (
                <Button
                  type="button"
                  onClick={handleStop}
                  variant="outline"
                  size="sm"
                  className="px-4 py-2"
                >
                  Stop
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || disabled}
                  size="sm"
                  className="px-4 py-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Button>
              )}
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default StreamingChatIntegrated