'use client'

import React, { useState } from 'react'
import { Button, Badge } from '@/components/ui'
import { Flex, Stack } from '@/components/layout'

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

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
  onRetry?: () => void
  onCopy?: () => void
  onSourceClick?: (page: number) => void
  showTimestamp?: boolean
  showMetadata?: boolean
  className?: string
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  onRetry,
  onCopy,
  onSourceClick,
  showTimestamp = true,
  showMetadata = false,
  className = '',
}) => {
  const [showSources, setShowSources] = useState(false)
  const [showFullMetadata, setShowFullMetadata] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const isUser = message.role === 'user'
  const isError = message.status === 'error'
  const isSending = message.status === 'sending'

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    if (messageDate.getTime() === today.getTime()) {
      return 'Today'
    } else if (messageDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
      return 'Yesterday'
    } else {
      return messageDate.toLocaleDateString()
    }
  }

  const handleCopy = async () => {
    if (onCopy) {
      onCopy()
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const renderContent = () => {
    if (isError && message.content === 'Failed to get response') {
      return (
        <div className="text-red-600">
          <p className="mb-2">Sorry, I couldn't generate a response.</p>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </div>
      )
    }

    // Split content by newlines and render paragraphs
    const paragraphs = message.content.split('\n').filter(p => p.trim())
    
    return (
      <div className="space-y-2">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    )
  }

  const renderSources = () => {
    if (!message.sources || message.sources.length === 0) return null

    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowSources(!showSources)}
          className="p-0 text-blue-600 hover:text-blue-700 mb-2"
        >
          <Flex gap="xs" align="center">
            <svg 
              className={`w-3 h-3 transition-transform ${showSources ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
          </Flex>
        </Button>

        {showSources && (
          <Stack spacing="xs">
            {message.sources.map((source, index) => (
              <div
                key={index}
                className="bg-blue-50 border border-blue-200 rounded-md p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => onSourceClick?.(source.page)}
              >
                <Flex gap="sm" align="start">
                  <Badge variant="info" size="sm">
                    Page {source.page}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    {source.section && (
                      <p className="text-xs font-medium text-blue-800 mb-1">
                        {source.section}
                      </p>
                    )}
                    <p className="text-xs text-blue-700 leading-relaxed truncate">
                      "{source.content}"
                    </p>
                  </div>
                </Flex>
              </div>
            ))}
          </Stack>
        )}
      </div>
    )
  }

  const renderMetadata = () => {
    if (!showMetadata || !message.metadata) return null

    return (
      <div className="mt-2 pt-2 border-t border-gray-200">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowFullMetadata(!showFullMetadata)}
          className="p-0 text-xs text-gray-500 hover:text-gray-700"
        >
          <Flex gap="xs" align="center">
            <svg 
              className={`w-3 h-3 transition-transform ${showFullMetadata ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Metadata
          </Flex>
        </Button>

        {showFullMetadata && (
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            {message.metadata.model && (
              <p>Model: {message.metadata.model}</p>
            )}
            {message.metadata.tokens && (
              <p>Tokens: {message.metadata.tokens}</p>
            )}
            {message.metadata.processingTime && (
              <p>Processing: {message.metadata.processingTime}ms</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}>
      <div className={`max-w-2xl ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message Content */}
        <div
          className={`p-3 rounded-lg relative ${
            isUser
              ? 'bg-blue-600 text-white ml-auto'
              : isError
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {/* Status indicator */}
          {isSending && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          )}
          {isError && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          )}
          {isStreaming && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          )}

          <div className="text-sm">
            {renderContent()}
          </div>

          {/* Sources for assistant messages */}
          {!isUser && renderSources()}
          
          {/* Metadata */}
          {!isUser && renderMetadata()}
        </div>

        {/* Timestamp and Actions */}
        <Flex 
          justify={isUser ? 'end' : 'start'} 
          align="center" 
          gap="sm" 
          className="mt-1 px-1"
        >
          {showTimestamp && (
            <span className="text-xs text-gray-500">
              {formatDate(message.timestamp)} at {formatTime(message.timestamp)}
            </span>
          )}
          
          {/* Action buttons */}
          {!isSending && !isStreaming && (
            <Flex gap="xs">
              {onCopy && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title={copySuccess ? 'Copied!' : 'Copy message'}
                >
                  {copySuccess ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </Button>
              )}
            </Flex>
          )}
        </Flex>
      </div>
    </div>
  )
}

export default ChatMessage