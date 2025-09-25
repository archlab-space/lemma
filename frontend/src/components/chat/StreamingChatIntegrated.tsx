'use client'

/**
 * Integrated Streaming Chat Component
 * Uses real API endpoints for document-based chat with streaming responses
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { chatService } from '@/lib/api'
import { ChatMessage, ChatSession, StreamingChatResponse } from '@/lib/api/types'
import { Card, CardContent, Button, Input, Badge } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { ErrorMessage } from '@/components/error'
import ChatMessageComponent from './ChatMessage'
import TypingIndicator from './TypingIndicator'

interface StreamingChatIntegratedProps {
  documentId: string
  sessionId?: string
  onSessionCreated?: (session: ChatSession) => void
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
  sessionId: initialSessionId,
  onSessionCreated,
  onMessageSent,
  onMessageReceived,
  onError,
  placeholder = "Ask a question about this document...",
  maxLength = 500,
  disabled = false,
  className = ''
}) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(initialSessionId)
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load existing messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadMessages()
    }
  }, [currentSessionId])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const loadMessages = async () => {
    if (!currentSessionId) return
    
    try {
      setLoading(true)
      const response = await chatService.getMessages(currentSessionId, { limit: 50 })
      setMessages(response.data || [])
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !inputValue.trim() || isStreaming || disabled) return

    const messageContent = inputValue.trim()
    setInputValue('')
    setError(null)
    
    // Create user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: messageContent,
      role: 'user',
      timestamp: new Date().toISOString(),
      sessionId: currentSessionId || ''
    }

    setMessages(prev => [...prev, userMessage])
    onMessageSent?.(userMessage)

    // Start streaming response
    setIsStreaming(true)
    setStreamingContent('')

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      if (!currentSessionId) {
        // Use quickChat to create session and get first response
        await chatService.quickChat(
          documentId,
          messageContent,
          (chunk: string) => {
            setStreamingContent(prev => prev + chunk)
          },
          (response: StreamingChatResponse & { session: ChatSession }) => {
            // Session created and response completed
            setCurrentSessionId(response.sessionId)
            onSessionCreated?.(response.session)

            const assistantMessage: ChatMessage = {
              id: response.messageId,
              content: response.content,
              role: 'assistant',
              timestamp: new Date().toISOString(),
              sessionId: response.sessionId,
              sources: response.sources,
              metadata: response.metadata
            }

            setMessages(prev => [...prev.slice(0, -1), userMessage, assistantMessage])
            onMessageReceived?.(assistantMessage)
            setIsStreaming(false)
            setStreamingContent('')
          },
          (error: Error) => {
            setError(error.message)
            onError?.(error.message)
            setIsStreaming(false)
            setStreamingContent('')
          },
          abortControllerRef.current.signal
        )
      } else {
        // Send message to existing session
        await chatService.sendMessage(
          {
            message: messageContent,
            sessionId: currentSessionId,
            documentId
          },
          (chunk: string) => {
            setStreamingContent(prev => prev + chunk)
          },
          (response: StreamingChatResponse) => {
            // Response completed
            const assistantMessage: ChatMessage = {
              id: response.messageId,
              content: response.content,
              role: 'assistant',
              timestamp: new Date().toISOString(),
              sessionId: response.sessionId,
              sources: response.sources,
              metadata: response.metadata
            }

            setMessages(prev => [...prev, assistantMessage])
            onMessageReceived?.(assistantMessage)
            setIsStreaming(false)
            setStreamingContent('')
          },
          (error: Error) => {
            setError(error.message)
            onError?.(error.message)
            setIsStreaming(false)
            setStreamingContent('')
          },
          abortControllerRef.current.signal
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      onError?.(errorMessage)
      setIsStreaming(false)
      setStreamingContent('')
      
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1))
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
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
                    message={message}
                    onSourceClick={(source) => console.log('Navigate to:', source)}
                    showSources={true}
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
                        timestamp: new Date().toISOString(),
                        sessionId: currentSessionId || ''
                      }}
                      isStreaming={true}
                      showSources={false}
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