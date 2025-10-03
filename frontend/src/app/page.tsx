'use client'

/**
 * Redesigned Homepage
 * Document-centric interface for starting conversations and managing sessions
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'
import { documentsService, chatService } from '@/lib/api'
import { Document, ChatConversation, UploadingFile } from '@/lib/api/types'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, LoadingState } from '@/components/ui'
import { Container, Grid, Stack, Flex } from '@/components/layout'
import { FileUploadIntegrated } from '@/components/upload'
import { ErrorBoundary } from '@/components/error'
import Link from 'next/link'

interface DocumentWithConversations extends Document {
  recentConversations?: ChatConversation[]
  conversationCount?: number
}

export default function HomePage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { state, loadDocuments, addNotification } = useApp()
  const router = useRouter()
  
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithConversations | null>(null)
  const [view, setView] = useState<'documents' | 'upload' | 'sessions'>('documents')

  // Use AppContext for documents and conversations
  const documents = state.documents
  const conversations = state.conversations
  const loading = state.loading.documents
  const conversationsLoading = state.loading.conversations

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  const handleSignOut = async () => {
    await signOut()
  }

  // Enrich documents with conversation data
  const documentsWithConversations: DocumentWithConversations[] = documents.map(doc => {
    const docConversations = conversations.filter(s => s.documentId === doc.documentId)
    return {
      ...doc,
      recentConversations: docConversations.slice(0, 3),
      conversationCount: docConversations.length
    }
  })


  const handleDocumentSelect = (document: DocumentWithConversations) => {
    setSelectedDocument(document)
  }

  const handleStartNewChat = async (documentId: string) => {
    try {
      const conversation = await chatService.createConversation({ document_id: documentId })
      router.push(`/chat/${conversation.id}`)
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to Start Chat',
        message: 'Could not create a new chat session'
      })
    }
  }

  const handleContinueConversation = (conversationId: string) => {
    router.push(`/chat/${conversationId}`)
  }

  const handleRetryProcessing = async (documentId: string) => {
    try {
      await documentsService.triggerProcessing(documentId)
      addNotification({
        type: 'success',
        title: 'Processing Started',
        message: 'Document processing has been triggered. It may take a few minutes to complete.'
      })
      // Refresh documents to show updated status
      loadDocuments()
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Processing Failed',
        message: error instanceof Error ? error.message : 'Failed to trigger document processing'
      })
    }
  }

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (status: Document['processingStatus']) => {
    switch (status) {
      case 'completed': return 'success'
      case 'processing': return 'warning'
      case 'pending': return 'info'
      case 'failed': return 'error'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: Document['processingStatus']) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'processing':
        return '⏳'
      case 'pending':
        return '📤'
      case 'failed':
        return '❌'
      default:
        return '📄'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingState message="Loading..." />
      </div>
    )
  }

  // Show landing page for unauthenticated users
  if (!user) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Container size="xl" className="py-16">
            <Stack spacing="xl" align="center">
              {/* Header */}
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">Lemma</h1>
                <p className="text-xl text-gray-600 mb-2">AI-Powered Academic Paper Analysis</p>
                <p className="text-gray-500">Upload. Analyze. Discover.</p>
              </div>

              {/* Hero Visual */}
              <div className="relative w-full max-w-2xl">
                <Card variant="elevated" className="p-8">
                  <Stack spacing="lg" align="center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Transform Your Research Experience
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Upload academic papers and engage in intelligent conversations powered by AI. 
                        Get instant insights, summaries, and answers to your research questions.
                      </p>
                    </div>
                    
                    <Flex gap="md">
                      <Button size="lg" asChild>
                        <Link href="/auth">Get Started</Link>
                      </Button>
                      <Button variant="outline" size="lg" asChild>
                        <Link href="/auth">Sign In</Link>
                      </Button>
                    </Flex>
                  </Stack>
                </Card>
              </div>

              {/* Features */}
              <Grid cols={1} responsive={{ md: 3 }} gap="lg" className="w-full max-w-4xl">
                <Card variant="outlined" className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Smart Upload</h4>
                  <p className="text-sm text-gray-600">Intelligent PDF processing with automatic extraction of key information</p>
                </Card>

                <Card variant="outlined" className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">AI Conversations</h4>
                  <p className="text-sm text-gray-600">Ask questions and get contextual answers based on your documents</p>
                </Card>

                <Card variant="outlined" className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Real-time Streaming</h4>
                  <p className="text-sm text-gray-600">Get responses as they&apos;re generated with live streaming technology</p>
                </Card>
              </Grid>
            </Stack>
          </Container>
        </div>
      </ErrorBoundary>
    )
  }

  // Main authenticated homepage
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <nav className="bg-white shadow-sm border-b">
          <Container size="xl">
            <Flex justify="between" align="center" className="h-16">
              <Flex align="center" gap="lg">
                <h1 className="text-2xl font-bold text-blue-600">Lemma</h1>
              </Flex>
              
              <Flex align="center" gap="md">
                <span className="text-sm text-gray-700">
                  Welcome, {user.user_metadata?.full_name || user.email}
                </span>
                
                <Flex align="center" gap="sm">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {getInitials(user.email)}
                      </span>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </Flex>
              </Flex>
            </Flex>
          </Container>
        </nav>

        <Container size="xl" className="py-8">
          <div className="grid grid-cols-12 gap-8 h-full">
            {/* Left Panel - Navigation & Content */}
            <div className="col-span-12 lg:col-span-8">
              <Stack spacing="lg">
                {/* View Selector */}
                <Card variant="outlined">
                  <CardContent className="p-4">
                    <Flex gap="sm">
                      <Button
                        variant={view === 'documents' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setView('documents')}
                      >
                        📄 My Documents ({documentsWithConversations.length})
                      </Button>
                      <Button
                        variant={view === 'sessions' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setView('sessions')}
                      >
                        💬 Recent Chats ({conversations.length})
                      </Button>
                      <Button
                        variant={view === 'upload' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setView('upload')}
                      >
                        ⬆️ Upload New
                      </Button>
                    </Flex>
                  </CardContent>
                </Card>

                {/* Content Area */}
                {loading ? (
                  <LoadingState message="Loading your workspace..." />
                ) : (
                  <>
                    {/* Documents View */}
                    {view === 'documents' && (
                      <div>
                        {documentsWithConversations.length === 0 ? (
                          <Card variant="elevated" className="p-12 text-center">
                            <Stack spacing="md" align="center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
                                <p className="text-gray-500 mb-6">Upload your first PDF to start analyzing academic papers</p>
                                <Button onClick={() => setView('upload')}>
                                  Upload Document
                                </Button>
                              </div>
                            </Stack>
                          </Card>
                        ) : (
                          <Grid cols={1} responsive={{ md: 2 }} gap="md">
                            {documentsWithConversations.map((document) => (
                              <Card
                                key={document.documentId}
                                variant="outlined"
                                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                                  selectedDocument?.documentId === document.documentId
                                    ? 'ring-2 ring-blue-500 shadow-md'
                                    : 'hover:ring-1 hover:ring-gray-300'
                                }`}
                                onClick={() => handleDocumentSelect(document)}
                              >
                                <CardContent className="p-6">
                                  <Stack spacing="sm">
                                    <Flex justify="between" align="start">
                                      <div className="flex-1 min-w-0">
                                        <Flex align="center" gap="sm" className="mb-2">
                                          <span className="text-lg">{getStatusIcon(document.processingStatus)}</span>
                                          <Badge variant={getStatusColor(document.processingStatus)} size="sm">
                                            {document.processingStatus}
                                          </Badge>
                                        </Flex>
                                        <h3 className="font-medium text-gray-900 truncate mb-1" title={document.title}>
                                          {document.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 truncate" title={document.filename}>
                                          {document.filename}
                                        </p>
                                      </div>
                                    </Flex>

                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      <span>{document.totalPages || 0} pages</span>
                                      <span>{formatFileSize(document.fileSizeBytes)}</span>
                                      <span>{formatDate(document.createdAt)}</span>
                                    </div>

                                    {document.conversationCount! > 0 && (
                                      <div className="pt-2 border-t">
                                        <Flex justify="between" align="center">
                                          <span className="text-xs text-gray-500">
                                            {document.conversationCount} conversation{document.conversationCount !== 1 ? 's' : ''}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (document.recentConversations?.[0]) {
                                                handleContinueConversation(document.recentConversations[0].id)
                                              }
                                            }}
                                          >
                                            Continue Last Chat
                                          </Button>
                                        </Flex>
                                      </div>
                                    )}

                                    {document.processingStatus === 'completed' && (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleStartNewChat(document.documentId)
                                        }}
                                        className="w-full mt-2"
                                      >
                                        Start New Chat
                                      </Button>
                                    )}

                                    {document.processingStatus === 'failed' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleRetryProcessing(document.documentId)
                                        }}
                                        className="w-full mt-2"
                                      >
                                        🔄 Retry Processing
                                      </Button>
                                    )}
                                  </Stack>
                                </CardContent>
                              </Card>
                            ))}
                          </Grid>
                        )}
                      </div>
                    )}

                    {/* Conversations View */}
                    {view === 'sessions' && (
                      <div>
                        {conversations.length === 0 ? (
                          <Card variant="elevated" className="p-12 text-center">
                            <Stack spacing="md" align="center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Chat Conversations</h3>
                                <p className="text-gray-500 mb-6">Start your first conversation with a document</p>
                                <Button onClick={() => setView('documents')}>
                                  Browse Documents
                                </Button>
                              </div>
                            </Stack>
                          </Card>
                        ) : (
                          <Stack spacing="sm">
                            {conversations.map((conversation) => (
                              <Card
                                key={conversation.id}
                                variant="outlined"
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handleContinueConversation(conversation.id)}
                              >
                                <CardContent className="p-4">
                                  <Flex justify="between" align="center">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-gray-900 truncate mb-1">
                                        {conversation.title}
                                      </h4>
                                      <p className="text-sm text-gray-500 truncate">
                                        Document: {conversation.documentId}
                                      </p>
                                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                                        <span>{conversation.messageCount} messages</span>
                                        <span>{formatDate(conversation.lastMessageAt || conversation.createdAt)}</span>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="ghost">
                                      Continue →
                                    </Button>
                                  </Flex>
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        )}
                      </div>
                    )}

                    {/* Upload View */}
                    {view === 'upload' && (
                      <Card variant="elevated">
                        <CardHeader>
                          <CardTitle>Upload New Document</CardTitle>
                          <p className="text-sm text-gray-500">
                            Upload a PDF document to start a new analysis conversation
                          </p>
                        </CardHeader>
                        <CardContent>
                          <FileUploadIntegrated
                            onUploadComplete={(document: Document) => {
                              addNotification({
                                type: 'success',
                                title: 'Upload Complete',
                                message: `${document.title} is being processed and will be available soon!`
                              })
                              loadDocuments() // Refresh documents through AppContext
                              setView('documents') // Switch back to documents view
                            }}
                            onUploadError={(file: UploadingFile, error: string) => {
                              addNotification({
                                type: 'error',
                                title: 'Upload Failed',
                                message: `Failed to upload ${file.name}: ${error}`
                              })
                            }}
                            onUploadStart={(file: UploadingFile) => {
                              addNotification({
                                type: 'info',
                                title: 'Upload Started',
                                message: `Processing ${file.name}...`
                              })
                            }}
                          />
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </Stack>
            </div>

            {/* Right Panel - Document Details */}
            <div className="col-span-12 lg:col-span-4">
              <div className="sticky top-8">
                {selectedDocument ? (
                  <Card variant="elevated">
                    <CardHeader>
                      <Flex align="center" gap="sm">
                        <span className="text-2xl">{getStatusIcon(selectedDocument.processingStatus)}</span>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="truncate" title={selectedDocument.title || selectedDocument.filename}>
                            {selectedDocument.title || selectedDocument.filename}
                          </CardTitle>
                          <Badge variant={getStatusColor(selectedDocument.processingStatus)} size="sm">
                            {selectedDocument.processingStatus}
                          </Badge>
                        </div>
                      </Flex>
                    </CardHeader>
                    <CardContent>
                      <Stack spacing="lg">
                        {/* Document Info */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Document Details</h4>
                          <Stack spacing="sm">
                            <Flex justify="between">
                              <span className="text-sm text-gray-500">Pages:</span>
                              <span className="text-sm font-medium">{selectedDocument.totalPages || 0}</span>
                            </Flex>
                            <Flex justify="between">
                              <span className="text-sm text-gray-500">Size:</span>
                              <span className="text-sm font-medium">{formatFileSize(selectedDocument.fileSizeBytes)}</span>
                            </Flex>
                            <Flex justify="between">
                              <span className="text-sm text-gray-500">Uploaded:</span>
                              <span className="text-sm font-medium">{formatDate(selectedDocument.createdAt)}</span>
                            </Flex>
                            {selectedDocument.processingCompletedAt && (
                              <Flex justify="between">
                                <span className="text-sm text-gray-500">Processed:</span>
                                <span className="text-sm font-medium">{formatDate(selectedDocument.processingCompletedAt)}</span>
                              </Flex>
                            )}
                          </Stack>
                        </div>

                        {/* Metadata */}
                        {(selectedDocument.authors || selectedDocument.abstract || selectedDocument.keywords) && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Document Details</h4>
                            <Stack spacing="sm">
                              {selectedDocument.authors && selectedDocument.authors.length > 0 && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Authors:</span>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {selectedDocument.authors.join(', ')}
                                  </p>
                                </div>
                              )}
                              {selectedDocument.abstract && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Abstract:</span>
                                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                    {selectedDocument.abstract}
                                  </p>
                                </div>
                              )}
                              {selectedDocument.keywords && selectedDocument.keywords.length > 0 && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700 block mb-2">Keywords:</span>
                                  <Flex gap="xl" wrap="wrap">
                                    {selectedDocument.keywords.map((keyword, index) => (
                                      <Badge key={index} variant="default" size="sm">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </Flex>
                                </div>
                              )}
                            </Stack>
                          </div>
                        )}

                        {/* Actions */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                          <Stack spacing="sm">
                            {selectedDocument.processingStatus === 'completed' ? (
                              <>
                                <Button
                                  onClick={() => handleStartNewChat(selectedDocument.documentId)}
                                  className="w-full"
                                >
                                  💬 Start New Chat
                                </Button>
                                {selectedDocument.recentConversations && selectedDocument.recentConversations.length > 0 && (
                                  <Button
                                    variant="outline"
                                    onClick={() => handleContinueConversation(selectedDocument.recentConversations![0].id)}
                                    className="w-full"
                                  >
                                    🔄 Continue Last Chat
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  onClick={() => router.push(`/document/${selectedDocument.documentId}`)}
                                  className="w-full"
                                >
                                  📖 View Document Details
                                </Button>
                              </>
                            ) : selectedDocument.processingStatus === 'processing' ? (
                              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                <p className="text-sm text-yellow-700 font-medium">Processing Document</p>
                                <p className="text-xs text-yellow-600 mt-1">
                                  This may take a few minutes for large documents
                                </p>
                              </div>
                            ) : selectedDocument.processingStatus === 'failed' ? (
                              <div className="text-center p-4 bg-red-50 rounded-lg">
                                <span className="text-2xl mb-2 block">❌</span>
                                <p className="text-sm text-red-700 font-medium">Processing Failed</p>
                                <p className="text-xs text-red-600 mt-1 mb-3">
                                  Document processing failed. You can try processing it again.
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRetryProcessing(selectedDocument.documentId)}
                                  className="border-red-300 text-red-700 hover:bg-red-100"
                                >
                                  🔄 Retry Processing
                                </Button>
                              </div>
                            ) : (
                              <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <span className="text-2xl mb-2 block">📤</span>
                                <p className="text-sm text-blue-700 font-medium">Processing Pending</p>
                                <p className="text-xs text-blue-600 mt-1">
                                  Your document is queued for processing
                                </p>
                              </div>
                            )}
                          </Stack>
                        </div>

                        {/* Recent Sessions */}
                        {selectedDocument.recentConversations && selectedDocument.recentConversations.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Recent Conversations</h4>
                            <Stack spacing="xs">
                              {selectedDocument.recentConversations.map((conversation) => (
                                <div
                                  key={conversation.id}
                                  className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                  onClick={() => handleContinueConversation(conversation.id)}
                                >
                                  <p className="text-sm font-medium text-gray-900 truncate mb-1">
                                    {conversation.title}
                                  </p>
                                  <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span>{conversation.messageCount} messages</span>
                                    <span>{formatDate(conversation.lastMessageAt || conversation.createdAt)}</span>
                                  </div>
                                </div>
                              ))}
                            </Stack>
                          </div>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ) : (
                  <Card variant="outlined" className="text-center p-8">
                    <Stack spacing="md" align="center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Select a Document</h3>
                        <p className="text-sm text-gray-500">
                          Choose a document from the left to see details and start a conversation
                        </p>
                      </div>
                    </Stack>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </Container>
      </div>
    </ErrorBoundary>
  )
}