'use client'

/**
 * Chat Session Page
 * Full-screen chat interface for document conversations
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'
import { chatService, documentsService } from '@/lib/api'
import { ChatConversation, Document, ChatMessage } from '@/lib/api/types'
import StreamingChatIntegrated  from '@/components/chat/StreamingChatIntegrated'
import DocumentDetailsPanel from '@/components/document/DocumentDetailsPanel'
import { Button, Card, CardContent, Badge, LoadingState } from '@/components/ui'
import { Container, Stack, Flex } from '@/components/layout'
import { ErrorBoundary } from '@/components/error'
import Link from 'next/link'

export default function ChatSessionPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { addNotification } = useApp()
  
  const conversationId = params?.id as string
  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDocumentDetails, setShowDocumentDetails] = useState(false)

  const loadConversation = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load session and document data
      const [conversationData] = await Promise.all([
        chatService.getConversation(conversationId),
      ])
      
      setConversation(conversationData.conversation)
      setMessages(conversationData.messages || [])
      
      // Load document details
      const documentData = await documentsService.getDocument(conversationData.conversation.documentId)
      setDocument(documentData)
      
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chat session'
      setError(errorMessage)
      addNotification({
        type: 'error',
        title: 'Loading Failed',
        message: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }, [conversationId, addNotification])

    useEffect(() => {
    if (conversationId && user?.id) {
      loadConversation()
    }
  }, [loadConversation, user?.id])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Stack spacing="md" align="center">
          <p className="text-gray-600">Please sign in to access your chat sessions.</p>
          <Button asChild>
            <Link href="/auth">Sign In</Link>
          </Button>
        </Stack>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingState message="Loading chat session..." />
      </div>
    )
  }

  if (error || !conversation || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Stack spacing="md" align="center">
          <div className="text-red-500">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Chat Session Not Found</h2>
          <p className="text-gray-600 text-center">
            The requested chat session could not be found or loaded.
          </p>
          <Flex gap="md">
            <Button variant="outline" asChild>
              <Link href="/">Back to Homepage</Link>
            </Button>
          </Flex>
        </Stack>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
        {/* Header */}
        <nav className="bg-white shadow-sm border-b flex-shrink-0">
          <Container size="xl">
            <Flex justify="between" align="center" className="h-16">
              <Flex align="center" gap="lg">
                <Button variant="ghost" asChild>
                  <Link href="/" className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Home
                  </Link>
                </Button>
                <div className="h-6 w-px bg-gray-300" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-semibold text-gray-900 truncate">
                    {conversation.title}
                  </h1>
                  <p className="text-sm text-gray-500 truncate">
                    {document.title}
                  </p>
                </div>
              </Flex>
              
              <Flex align="center" gap="md">
                <Badge variant="default" size="sm">
                  {conversation.messageCount} messages
                </Badge>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDocumentDetails(!showDocumentDetails)}
                >
                  {showDocumentDetails ? 'Hide' : 'Show'} Document Info
                </Button>
              </Flex>
            </Flex>
          </Container>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Chat Area */}
          <div className={`flex-1 transition-all duration-300 ${showDocumentDetails ? 'mr-[32rem]' : ''}`}>
            <Container size="xl" className="h-full">
              <div className="h-full">
                <StreamingChatIntegrated
                  documentId={document.id}
                  conversationId={conversation.id}
                  initialMessages={messages}
                  onMessageSent={(message: ChatMessage) => {
                    console.log('Message sent:', message)
                    setMessages(prev => [...prev, message])
                    // Update session message count
                    setConversation(prev => prev ? {
                      ...prev,
                      messageCount: prev.messageCount + 1,
                      lastActivity: new Date().toISOString()
                    } : null)
                  }}
                  onMessageReceived={(message: ChatMessage) => {
                    console.log('Message received:', message)
                    setMessages(prev => [...prev, message])
                    // Update session message count
                    setConversation(prev => prev ? {
                      ...prev,
                      messageCount: prev.messageCount + 1,
                      lastActivity: new Date().toISOString()
                    } : null)
                  }}
                  onError={(error) => {
                    console.error('Chat error:', error)
                    addNotification({
                      type: 'error',
                      title: 'Chat Error',
                      message: error
                    })
                  }}
                  placeholder={`Ask a question about "${document.title}"`}
                  className="h-full"
                />
              </div>
            </Container>
          </div>

          {/* Document Details Sidebar */}
          {showDocumentDetails && (
            <div className="fixed right-0 top-16 bottom-0 w-[32rem] bg-white border-l shadow-lg z-40">
              <DocumentDetailsPanel
                document={document}
                onClose={() => setShowDocumentDetails(false)}
              />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}