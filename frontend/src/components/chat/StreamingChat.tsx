'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, Button, Input, Badge } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { useStreamingSSE } from '@/hooks/useStreamingSSE'
import ChatMessage from './ChatMessage'
import TypingIndicator from './TypingIndicator'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
  sources?: Array<{
    page: number
    section: string
    content: string
  }>
  metadata?: {
    model?: string
    tokens?: number
    processingTime?: number
  }
}

interface StreamingChatProps {
  documentId: string
  sessionId?: string
  initialMessages?: Message[]
  onMessageSent?: (message: Message) => void
  onMessageReceived?: (message: Message) => void
  onError?: (error: string) => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  className?: string
}

const StreamingChat: React.FC<StreamingChatProps> = ({
  documentId,
  sessionId,
  initialMessages = [],
  onMessageSent,
  onMessageReceived,
  onError,
  placeholder = "Ask a question about this document...",
  maxLength = 500,
  disabled = false,
  className = '',
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Streaming hook
  const { startStreaming, stopStreaming, streamingText, error: streamingError } = useStreamingSSE()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Handle streaming text updates
  useEffect(() => {
    if (!streamingMessageId || !streamingText) return

    setMessages(prev => prev.map(msg => 
      msg.id === streamingMessageId 
        ? { ...msg, content: streamingText, status: 'sent' }
        : msg
    ))
  }, [streamingText, streamingMessageId])

  // Handle streaming errors
  useEffect(() => {
    if (streamingError) {
      if (streamingMessageId) {
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessageId 
            ? { ...msg, status: 'error', content: 'Failed to get response' }
            : msg
        ))
        setStreamingMessageId(null)
      }
      setIsStreaming(false)
      onError?.(streamingError)
    }
  }, [streamingError, streamingMessageId, onError])

  const handleSendMessage = async () => {
    if (!input.trim() || disabled || isStreaming) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: input.trim(),
      role: 'user',
      timestamp: new Date(),
      status: 'sent',
    }

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      status: 'sending',
    }

    // Add messages
    setMessages(prev => [...prev, userMessage, assistantMessage])
    onMessageSent?.(userMessage)

    // Clear input and start streaming
    const currentInput = input
    setInput('')
    setIsStreaming(true)
    setStreamingMessageId(assistantMessage.id)

    try {
      // Start streaming response
      await startStreaming('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          documentId,
          sessionId,
          messageHistory: messages.slice(-10), // Send last 10 messages for context
        }),
      })
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, status: 'error', content: 'Failed to send message' }
          : msg
      ))
      onError?.(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setIsStreaming(false)
      setStreamingMessageId(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleStopStreaming = () => {
    stopStreaming()
    setIsStreaming(false)
    setStreamingMessageId(null)
  }

  const retryMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1) return

    const message = messages[messageIndex]
    if (message.role !== 'user') return

    // Find the previous user message and retry
    setInput(message.content)
    inputRef.current?.focus()
  }

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }

  return (
    <Card variant="outlined" className={className}>
      <CardContent className="p-0">
        <Stack spacing="none" className="h-full">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <Flex justify="between" align="center">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Document Chat
                </h3>
                <p className="text-xs text-gray-500">
                  Ask questions about this document
                </p>
              </div>
              
              {messages.length > 0 && (
                <Badge variant="default" size="sm">
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </Flex>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start a Conversation
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Ask questions about this document and get AI-powered answers based on the content.
                </p>
              </div>
            ) : (
              <Stack spacing="md">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={message.id === streamingMessageId}
                    onRetry={message.status === 'error' ? () => retryMessage(message.id) : undefined}
                    onCopy={() => copyMessage(message.content)}
                  />
                ))}
                
                {isStreaming && streamingMessageId && (
                  <TypingIndicator />
                )}
                
                <div ref={messagesEndRef} />
              </Stack>
            )}
          </div>

          {/* Input Area */}
          <div className="px-4 py-3 border-t border-gray-200">
            <Stack spacing="sm">
              {isStreaming && (
                <Flex justify="center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStopStreaming}
                    className="text-red-600 hover:text-red-700 border-red-300"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                    </svg>
                    Stop Response
                  </Button>
                </Flex>
              )}
              
              <Flex gap="sm">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder}
                  disabled={disabled || isStreaming}
                  maxLength={maxLength}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || disabled || isStreaming}
                  variant="primary"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Button>
              </Flex>
              
              <div className="text-xs text-gray-500 text-right">
                {input.length}/{maxLength}
              </div>
            </Stack>
          </div>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default StreamingChat