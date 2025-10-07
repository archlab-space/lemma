'use client'

/**
 * Redesigned Homepage
 * Document-centric interface for starting conversations and managing sessions
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'
import { documentsService, chatService } from '@/lib/api'
import { Document, ChatConversation, UploadingFile } from '@/lib/api/types'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, LoadingState, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { Container, Grid, Stack, Flex, Header } from '@/components/layout'
import { FileUploadIntegrated } from '@/components/upload'
import { ErrorBoundary } from '@/components/error'

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

  // Enrich documents with conversation data
  const documentsWithConversations: DocumentWithConversations[] = documents.map(doc => {
    const docConversations = conversations.filter(s => s.documentId === doc.id)
    return {
      ...doc,
      recentConversations: docConversations.slice(0, 3),
      conversationCount: docConversations.length
    }
  })


  const handleDocumentSelect = (document: DocumentWithConversations) => {
    console.log(document.enrichment)
    
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
        <Header />

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
                                key={document.id}
                                variant="outlined"
                                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                                  selectedDocument?.id === document.id
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
                                          handleStartNewChat(document.id)
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
                                          handleRetryProcessing(document.id)
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
                  <Card variant="elevated" className="flex flex-col h-[calc(100vh-8rem)]">
                    <CardHeader className="flex-shrink-0">
                      <Flex align="center" gap="sm">
                        <div className="flex-1 min-w-0">
                          <CardTitle title={selectedDocument.title || selectedDocument.filename}>
                            {selectedDocument.title || selectedDocument.filename}
                          </CardTitle>
                        </div>
                      </Flex>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                      <Tabs defaultValue="overview" className="h-full flex flex-col">
                        <TabsList className="flex-shrink-0 px-6">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="metadata">Metadata</TabsTrigger>
                          <TabsTrigger value="enrichment">Insights</TabsTrigger>
                          {selectedDocument.outline && Array.isArray(selectedDocument.outline) && selectedDocument.outline.length > 0 && (
                            <TabsTrigger value="outline">Outline</TabsTrigger>
                          )}
                        </TabsList>

                        <div className="flex-1 overflow-y-auto">
                          <TabsContent value="overview" className="p-6">
                            <Stack spacing="md">
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Document Info</h4>
                                <Stack spacing="sm">
                                  <Flex justify="between">
                                    <span className="text-sm text-gray-600">Pages</span>
                                    <span className="text-sm font-medium">{selectedDocument.totalPages || 0}</span>
                                  </Flex>
                                  <Flex justify="between">
                                    <span className="text-sm text-gray-600">Words</span>
                                    <span className="text-sm font-medium">{selectedDocument.totalWords?.toLocaleString() || 'N/A'}</span>
                                  </Flex>
                                  <Flex justify="between">
                                    <span className="text-sm text-gray-600">Size</span>
                                    <span className="text-sm font-medium">{formatFileSize(selectedDocument.fileSizeBytes)}</span>
                                  </Flex>
                                  <Flex justify="between">
                                    <span className="text-sm text-gray-600">Language</span>
                                    <span className="text-sm font-medium">{selectedDocument.language || 'N/A'}</span>
                                  </Flex>
                                </Stack>
                              </div>

                              <div className="border-t pt-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Processing</h4>
                                <Stack spacing="sm">
                                  <Flex justify="between">
                                    <span className="text-sm text-gray-600">Uploaded</span>
                                    <span className="text-sm font-medium">{formatDate(selectedDocument.createdAt)}</span>
                                  </Flex>
                                  {selectedDocument.processingCompletedAt && (
                                    <Flex justify="between">
                                      <span className="text-sm text-gray-600">Completed</span>
                                      <span className="text-sm font-medium">{formatDate(selectedDocument.processingCompletedAt)}</span>
                                    </Flex>
                                  )}
                                  <Flex justify="between">
                                    <span className="text-sm text-gray-600">Chunks</span>
                                    <span className="text-sm font-medium">{selectedDocument.totalChunks || 0}</span>
                                  </Flex>
                                  {selectedDocument.embeddingStatus && (
                                    <Flex justify="between">
                                      <span className="text-sm text-gray-600">Embedding</span>
                                      <Badge variant={selectedDocument.embeddingStatus.status === 'completed' ? 'success' : 'warning'} size="sm">
                                        {selectedDocument.embeddingStatus.status}
                                      </Badge>
                                    </Flex>
                                  )}
                                </Stack>
                              </div>

                              {selectedDocument.processingError && (
                                <div className="border-t pt-4">
                                  <h4 className="text-xs font-semibold text-red-600 uppercase mb-2">Error</h4>
                                  <p className="text-sm text-red-600">{selectedDocument.processingError}</p>
                                </div>
                              )}
                            </Stack>
                          </TabsContent>

                          <TabsContent value="metadata" className="p-6">
                            <Stack spacing="md">
                              {selectedDocument.authors && selectedDocument.authors.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Authors</h4>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {selectedDocument.authors.join(', ')}
                                  </p>
                                </div>
                              )}

                              {selectedDocument.abstract && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Abstract</h4>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {selectedDocument.abstract}
                                  </p>
                                </div>
                              )}

                              {selectedDocument.keywords && selectedDocument.keywords.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Keywords</h4>
                                  <Flex gap="sm" wrap="wrap">
                                    {selectedDocument.keywords.map((keyword, index) => (
                                      <Badge key={index} variant="default" size="sm">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </Flex>
                                </div>
                              )}

                              {selectedDocument.doi && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">DOI</h4>
                                  <p className="text-sm text-gray-700">{selectedDocument.doi}</p>
                                </div>
                              )}

                              {selectedDocument.journal && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Journal</h4>
                                  <p className="text-sm text-gray-700">{selectedDocument.journal}</p>
                                </div>
                              )}

                              {selectedDocument.publicationYear && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Publication Year</h4>
                                  <p className="text-sm text-gray-700">{selectedDocument.publicationYear}</p>
                                </div>
                              )}

                              {!selectedDocument.authors && !selectedDocument.abstract && !selectedDocument.keywords && !selectedDocument.doi && !selectedDocument.journal && !selectedDocument.publicationYear && (
                                <div className="text-center py-8">
                                  <p className="text-sm text-gray-500">No metadata available</p>
                                </div>
                              )}
                            </Stack>
                          </TabsContent>

                          <TabsContent value="enrichment" className="p-6">
                            <Stack spacing="md">
                              {selectedDocument.enrichment?.research_questions && selectedDocument.enrichment.research_questions.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Research Questions</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {selectedDocument.enrichment.research_questions.map((question, index) => (
                                      <li key={index} className="text-sm text-gray-700">{question}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {selectedDocument.enrichment?.key_contributions && selectedDocument.enrichment.key_contributions.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Key Contributions</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {selectedDocument.enrichment.key_contributions.map((contribution, index) => (
                                      <li key={index} className="text-sm text-gray-700">{contribution}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {selectedDocument.enrichment?.methodology_summary && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Methodology</h4>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {selectedDocument.enrichment.methodology_summary}
                                  </p>
                                </div>
                              )}

                              {selectedDocument.enrichment?.key_concepts && selectedDocument.enrichment.key_concepts.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Key Concepts</h4>
                                  <Flex gap="sm" wrap="wrap">
                                    {selectedDocument.enrichment.key_concepts.map((concept, index) => (
                                      <Badge key={index} variant="info" size="sm">
                                        {concept}
                                      </Badge>
                                    ))}
                                  </Flex>
                                </div>
                              )}

                              {selectedDocument.enrichment?.related_topics && selectedDocument.enrichment.related_topics.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Related Topics</h4>
                                  <Flex gap="sm" wrap="wrap">
                                    {selectedDocument.enrichment.related_topics.map((topic, index) => (
                                      <Badge key={index} variant="default" size="sm">
                                        {topic}
                                      </Badge>
                                    ))}
                                  </Flex>
                                </div>
                              )}

                              {selectedDocument.enrichment?.difficulty_level && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Difficulty Level</h4>
                                  <Badge
                                    variant={
                                      selectedDocument.enrichment.difficulty_level === 'beginner' ? 'success' :
                                      selectedDocument.enrichment.difficulty_level === 'intermediate' ? 'warning' : 'error'
                                    }
                                  >
                                    {selectedDocument.enrichment.difficulty_level}
                                  </Badge>
                                </div>
                              )}

                              {selectedDocument.enrichment?.reading_time_minutes && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Reading Time</h4>
                                  <p className="text-sm text-gray-700">{selectedDocument.enrichment.reading_time_minutes} minutes</p>
                                </div>
                              )}

                              {selectedDocument.enrichment?.readability_score && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Readability Score</h4>
                                  <p className="text-sm text-gray-700">{(selectedDocument.enrichment.readability_score * 100).toFixed(0)}%</p>
                                </div>
                              )}

                              {selectedDocument.enrichment?.technical_terms && selectedDocument.enrichment.technical_terms.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Technical Terms</h4>
                                  <Stack spacing="sm">
                                    {selectedDocument.enrichment.technical_terms.map((item, index) => (
                                      <div key={index}>
                                        <p className="text-sm font-medium text-gray-900">{item.term}</p>
                                        <p className="text-sm text-gray-600">{item.definition}</p>
                                      </div>
                                    ))}
                                  </Stack>
                                </div>
                              )}

                              {selectedDocument.enrichment?.future_work_suggestions && selectedDocument.enrichment.future_work_suggestions.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Future Work</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {selectedDocument.enrichment.future_work_suggestions.map((suggestion, index) => (
                                      <li key={index} className="text-sm text-gray-700">{suggestion}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {selectedDocument.enrichment?.citation_impact_prediction && (
                                <div className="border-t pt-4">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Citation Impact Prediction</h4>
                                  <Stack spacing="sm">
                                    <Flex justify="between" align="center">
                                      <span className="text-sm text-gray-600">Predicted Citations</span>
                                      <span className="text-lg font-semibold text-blue-600">
                                        {selectedDocument.enrichment.citation_impact_prediction.predicted_citations}
                                      </span>
                                    </Flex>
                                    <Flex justify="between" align="center">
                                      <span className="text-sm text-gray-600">Confidence</span>
                                      <span className="text-sm font-medium">
                                        {(selectedDocument.enrichment.citation_impact_prediction.confidence * 100).toFixed(0)}%
                                      </span>
                                    </Flex>
                                    {selectedDocument.enrichment.citation_impact_prediction.reasoning && (
                                      <div className="mt-2">
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                          {selectedDocument.enrichment.citation_impact_prediction.reasoning}
                                        </p>
                                      </div>
                                    )}
                                  </Stack>
                                </div>
                              )}

                              {!selectedDocument.enrichment && (
                                <div className="text-center py-8">
                                  <p className="text-sm text-gray-500">No insights available</p>
                                </div>
                              )}
                            </Stack>
                          </TabsContent>

                          {selectedDocument.outline && Array.isArray(selectedDocument.outline) && selectedDocument.outline.length > 0 && (
                            <TabsContent value="outline" className="p-6">
                              <Stack spacing="xs">
                                {selectedDocument.outline.map((item, index) => (
                                  <div
                                    key={index}
                                    className="py-2"
                                    style={{ paddingLeft: `${item.level * 12}px` }}
                                  >
                                    <Flex justify="between" align="start">
                                      <p className="text-sm text-gray-900 flex-1">{item.title}</p>
                                      {item.page && (
                                        <span className="text-xs text-gray-500 ml-2">p.{item.page}</span>
                                      )}
                                    </Flex>
                                  </div>
                                ))}
                              </Stack>
                            </TabsContent>
                          )}
                        </div>
                      </Tabs>
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