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
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, LoadingState, Tabs, TabsList, TabsTrigger, TabsContent, Input } from '@/components/ui'
import { DocumentCardSkeleton } from '@/components/ui/skeletons'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date')
  const [showFullAbstract, setShowFullAbstract] = useState(false)

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

  // Filter and sort documents
  const filteredDocuments = documentsWithConversations
    .filter(doc => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = doc.title?.toLowerCase().includes(query)
        const matchesFilename = doc.filename.toLowerCase().includes(query)
        const matchesAuthors = doc.authors?.some(author => author.toLowerCase().includes(query))
        if (!matchesTitle && !matchesFilename && !matchesAuthors) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && doc.processingStatus !== statusFilter) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || a.filename).localeCompare(b.title || b.filename)
        case 'status':
          return a.processingStatus.localeCompare(b.processingStatus)
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
            <div className={selectedDocument ? "col-span-12 lg:col-span-8" : "col-span-12"}>
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
                  <Grid
                    cols={1}
                    responsive={{ sm: 1, md: 2, lg: 3, xl: 4 }}
                    gap="md"
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <DocumentCardSkeleton key={i} />
                    ))}
                  </Grid>
                ) : (
                  <>
                    {/* Documents View */}
                    {view === 'documents' && (
                      <div>
                        {/* Search and Filter Bar */}
                        {documentsWithConversations.length > 0 && (
                          <Card variant="outlined" className="mb-4">
                            <CardContent className="p-4">
                              <div className="flex flex-col md:flex-row gap-4">
                                {/* Search Input */}
                                <div className="flex-1">
                                  <Input
                                    type="text"
                                    placeholder="Search documents by title, filename, or author..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full"
                                  />
                                </div>

                                {/* Status Filter */}
                                <div className="flex gap-2">
                                  <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="all">All Status</option>
                                    <option value="completed">Completed</option>
                                    <option value="processing">Processing</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                  </select>

                                  {/* Sort Dropdown */}
                                  <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'status')}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="date">Sort by Date</option>
                                    <option value="title">Sort by Title</option>
                                    <option value="status">Sort by Status</option>
                                  </select>
                                </div>
                              </div>

                              {/* Results count */}
                              {(searchQuery || statusFilter !== 'all') && (
                                <div className="mt-2 text-sm text-gray-600">
                                  Showing {filteredDocuments.length} of {documentsWithConversations.length} documents
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

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
                          <Grid
                            cols={1}
                            responsive={
                              selectedDocument
                                ? { sm: 1, md: 2, lg: 2 }  // 2 columns when right panel is visible
                                : { sm: 1, md: 2, lg: 3, xl: 3 }  // More columns when right panel is hidden
                            }
                            gap="md"
                          >
                            {filteredDocuments.length === 0 ? (
                              <div className="col-span-full">
                                <Card variant="outlined" className="p-12 text-center">
                                  <Stack spacing="md" align="center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
                                      <p className="text-gray-500">Try adjusting your search or filters</p>
                                    </div>
                                  </Stack>
                                </Card>
                              </div>
                            ) : null}
                            {filteredDocuments.map((document) => (
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
                                    {/* Header with status */}
                                    <Flex justify="between" align="start">
                                      <div className="flex-1 min-w-0">
                                        <Flex align="center" gap="sm" className="mb-2">
                                          <span className="text-lg">{getStatusIcon(document.processingStatus)}</span>
                                          <Badge variant={getStatusColor(document.processingStatus)} size="sm">
                                            {document.processingStatus}
                                          </Badge>
                                        </Flex>
                                        <h3 className="font-medium text-gray-900 line-clamp-2 mb-1" title={document.title || document.filename}>
                                          {document.title || document.filename}
                                        </h3>
                                        {document.title && (
                                          <p className="text-xs text-gray-400 truncate" title={document.filename}>
                                            {document.filename}
                                          </p>
                                        )}
                                      </div>
                                    </Flex>

                                    {/* Authors */}
                                    {document.authors && document.authors.length > 0 && (
                                      <p className="text-xs text-gray-600 truncate" title={document.authors.join(', ')}>
                                        {document.authors.slice(0, 3).join(', ')}
                                        {document.authors.length > 3 && ` +${document.authors.length - 3} more`}
                                      </p>
                                    )}

                                    {/* Enrichment badges */}
                                    {document.enrichment && (
                                      <Flex gap="xs" wrap="wrap">
                                        {document.enrichment.difficulty_level && (
                                          <Badge
                                            variant={
                                              document.enrichment.difficulty_level === 'beginner' ? 'success' :
                                              document.enrichment.difficulty_level === 'intermediate' ? 'warning' : 'error'
                                            }
                                            size="sm"
                                          >
                                            {document.enrichment.difficulty_level}
                                          </Badge>
                                        )}
                                        {document.enrichment.reading_time_minutes && (
                                          <Badge variant="info" size="sm">
                                            {document.enrichment.reading_time_minutes} min read
                                          </Badge>
                                        )}
                                      </Flex>
                                    )}

                                    {/* Document stats */}
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      <span>{document.totalPages || 0} pages</span>
                                      <span>{formatFileSize(document.fileSizeBytes)}</span>
                                      <span>{formatDate(document.createdAt)}</span>
                                    </div>

                                    
                                    <div className="pt-2 border-t">
                                      <Flex justify="between" align="center">
                                        <span className="text-xs text-gray-500 h-8 inline-flex items-center justify-center">
                                          {document.conversationCount} conversation{document.conversationCount !== 1 ? 's' : ''}
                                        </span>
                                        {document.conversationCount! > 0 && (
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
                                        )}
                                      </Flex>
                                    </div>
                                    

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
            {selectedDocument && (
              <div className="col-span-12 lg:col-span-4">
                <div className="sticky top-8">
                  {selectedDocument ? (
                  <Card variant="elevated" className="flex flex-col h-[calc(100vh-8rem)]">
                    <CardHeader className="flex-shrink-0 border-b border-gray-100">
                      <Flex align="start" gap="sm" justify="between">
                        <div className="flex-1 min-w-0">
                          <h2
                            className="text-lg font-semibold text-gray-900 leading-tight mb-1 break-words"
                          >
                            {selectedDocument.title || selectedDocument.filename}
                          </h2>
                          {selectedDocument.authors && selectedDocument.authors.length > 0 && (
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {selectedDocument.authors.join(', ')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedDocument(null)}
                          className="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          aria-label="Close panel"
                        >
                          <svg className="w-5 h-5 text-gray-400 hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Flex>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                      <Tabs defaultValue="summary" orientation="vertical" className="h-full flex flex-row">
                        <TabsList className="flex-shrink-0 w-12 sm:w-16 lg:w-20">
                          <TabsTrigger value="summary" hideLabel={true} className="lg:hidden">📊 Summary</TabsTrigger>
                          <TabsTrigger value="summary" hideLabel={false} className="hidden lg:flex">📊 Summary</TabsTrigger>

                          <TabsTrigger value="metadata" hideLabel={true} className="lg:hidden">📄 Metadata</TabsTrigger>
                          <TabsTrigger value="metadata" hideLabel={false} className="hidden lg:flex">📄 Metadata</TabsTrigger>

                          <TabsTrigger value="enrichment" hideLabel={true} className="lg:hidden">💡 Insights</TabsTrigger>
                          <TabsTrigger value="enrichment" hideLabel={false} className="hidden lg:flex">💡 Insights</TabsTrigger>

                          {selectedDocument.outline && Array.isArray(selectedDocument.outline) && selectedDocument.outline.length > 0 && (
                            <>
                              <TabsTrigger value="outline" hideLabel={true} className="lg:hidden">📑 Outline</TabsTrigger>
                              <TabsTrigger value="outline" hideLabel={false} className="hidden lg:flex">📑 Outline</TabsTrigger>
                            </>
                          )}
                        </TabsList>

                        <div className="flex-1 overflow-y-auto">
                          <TabsContent value="summary" className="p-6">
                            <Stack spacing="lg">
                              {/* Quick Stats - Most Relevant Info */}
                              {selectedDocument.enrichment && (
                                <div className="bg-blue-50 rounded-lg p-4">
                                  <Stack spacing="sm">
                                    {selectedDocument.enrichment.reading_time_minutes && (
                                      <Flex align="center" gap="sm">
                                        <span className="text-sm text-gray-600">⏱️ Reading Time:</span>
                                        <span className="text-sm font-semibold text-blue-700">{selectedDocument.enrichment.reading_time_minutes} min</span>
                                      </Flex>
                                    )}
                                    {selectedDocument.enrichment.difficulty_level && (
                                      <Flex align="center" gap="sm">
                                        <span className="text-sm text-gray-600">📚 Difficulty:</span>
                                        <Badge
                                          variant={
                                            selectedDocument.enrichment.difficulty_level === 'beginner' ? 'success' :
                                            selectedDocument.enrichment.difficulty_level === 'intermediate' ? 'warning' : 'error'
                                          }
                                          size="sm"
                                        >
                                          {selectedDocument.enrichment.difficulty_level}
                                        </Badge>
                                      </Flex>
                                    )}
                                  </Stack>
                                </div>
                              )}

                              {/* Document Info */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                  <span>📄</span> Document Information
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-xs text-gray-500 block mb-1">Pages</span>
                                    <span className="text-sm font-medium text-gray-900">{selectedDocument.totalPages || 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-xs text-gray-500 block mb-1">Words</span>
                                    <span className="text-sm font-medium text-gray-900">{selectedDocument.totalWords?.toLocaleString() || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-xs text-gray-500 block mb-1">Size</span>
                                    <span className="text-sm font-medium text-gray-900">{formatFileSize(selectedDocument.fileSizeBytes)}</span>
                                  </div>
                                  <div>
                                    <span className="text-xs text-gray-500 block mb-1">Language</span>
                                    <span className="text-sm font-medium text-gray-900">{selectedDocument.language || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Technical Details - Collapsible */}
                              <details className="border-t pt-4">
                                <summary className="text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                                  Technical Details
                                </summary>
                                <Stack spacing="sm" className="mt-3">
                                  <Flex justify="between">
                                    <span className="text-xs text-gray-500">Uploaded</span>
                                    <span className="text-xs text-gray-700">{formatDate(selectedDocument.createdAt)}</span>
                                  </Flex>
                                  {selectedDocument.processingCompletedAt && (
                                    <Flex justify="between">
                                      <span className="text-xs text-gray-500">Processed</span>
                                      <span className="text-xs text-gray-700">{formatDate(selectedDocument.processingCompletedAt)}</span>
                                    </Flex>
                                  )}
                                  <Flex justify="between">
                                    <span className="text-xs text-gray-500">Chunks</span>
                                    <span className="text-xs text-gray-700">{selectedDocument.totalChunks || 0}</span>
                                  </Flex>
                                  {selectedDocument.embeddingStatus && (
                                    <Flex justify="between">
                                      <span className="text-xs text-gray-500">Embedding</span>
                                      <Badge variant={selectedDocument.embeddingStatus.status === 'completed' ? 'success' : 'warning'} size="sm">
                                        {selectedDocument.embeddingStatus.status}
                                      </Badge>
                                    </Flex>
                                  )}
                                </Stack>
                              </details>

                              {selectedDocument.processingError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                  <h4 className="text-sm font-semibold text-red-700 mb-2">⚠️ Processing Error</h4>
                                  <p className="text-sm text-red-600">{selectedDocument.processingError}</p>
                                </div>
                              )}
                            </Stack>
                          </TabsContent>

                          <TabsContent value="metadata" className="p-6">
                            <Stack spacing="lg">
                              {selectedDocument.authors && selectedDocument.authors.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span>👥</span> Authors
                                  </h4>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {selectedDocument.authors.join(', ')}
                                  </p>
                                </div>
                              )}

                              {selectedDocument.abstract && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span>📝</span> Abstract
                                  </h4>
                                  <div className="relative">
                                    <p className={`text-sm text-gray-700 leading-relaxed ${!showFullAbstract && selectedDocument.abstract.length > 300 ? 'line-clamp-4' : ''}`}>
                                      {selectedDocument.abstract}
                                    </p>
                                    {selectedDocument.abstract.length > 300 && (
                                      <button
                                        onClick={() => setShowFullAbstract(!showFullAbstract)}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                                      >
                                        {showFullAbstract ? 'Show less' : 'Show more'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {selectedDocument.keywords && selectedDocument.keywords.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span>🏷️</span> Keywords
                                  </h4>
                                  <Flex gap="sm" wrap="wrap">
                                    {selectedDocument.keywords.map((keyword, index) => (
                                      <Badge key={index} variant="default" size="sm">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </Flex>
                                </div>
                              )}

                              {/* Publication Details */}
                              {(selectedDocument.doi || selectedDocument.journal || selectedDocument.publicationYear) && (
                                <div className="border-t pt-4">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span>📚</span> Publication Details
                                  </h4>
                                  <Stack spacing="sm">
                                    {selectedDocument.journal && (
                                      <div>
                                        <span className="text-xs text-gray-500 block mb-1">Journal</span>
                                        <p className="text-sm text-gray-700">{selectedDocument.journal}</p>
                                      </div>
                                    )}
                                    {selectedDocument.publicationYear && (
                                      <div>
                                        <span className="text-xs text-gray-500 block mb-1">Year</span>
                                        <p className="text-sm text-gray-700">{selectedDocument.publicationYear}</p>
                                      </div>
                                    )}
                                    {selectedDocument.doi && (
                                      <div>
                                        <span className="text-xs text-gray-500 block mb-1">DOI</span>
                                        <p className="text-sm text-gray-700 font-mono">{selectedDocument.doi}</p>
                                      </div>
                                    )}
                                  </Stack>
                                </div>
                              )}

                              {!selectedDocument.authors && !selectedDocument.abstract && !selectedDocument.keywords && !selectedDocument.doi && !selectedDocument.journal && !selectedDocument.publicationYear && (
                                <div className="text-center py-12">
                                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <p className="text-sm text-gray-600 font-medium mb-1">No Publication Metadata</p>
                                  <p className="text-xs text-gray-500">Author, journal, and citation information was not extracted from this document</p>
                                </div>
                              )}
                            </Stack>
                          </TabsContent>

                          <TabsContent value="enrichment" className="p-6">
                            {selectedDocument.enrichment ? (
                              <Stack spacing="lg">
                                {/* High Priority: Research Questions & Contributions */}
                                {selectedDocument.enrichment.research_questions && selectedDocument.enrichment.research_questions.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                      <span>❓</span> Research Questions
                                    </h4>
                                    <ul className="space-y-2 pl-4">
                                      {selectedDocument.enrichment.research_questions.map((question, index) => (
                                        <li key={index} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                                          <span className="text-blue-500 flex-shrink-0">•</span>
                                          <span>{question}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {selectedDocument.enrichment.key_contributions && selectedDocument.enrichment.key_contributions.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                      <span>⭐</span> Key Contributions
                                    </h4>
                                    <ul className="space-y-2 pl-4">
                                      {selectedDocument.enrichment.key_contributions.map((contribution, index) => (
                                        <li key={index} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                                          <span className="text-green-500 flex-shrink-0">•</span>
                                          <span>{contribution}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {selectedDocument.enrichment.methodology_summary && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                      <span>🔬</span> Methodology
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">
                                      {selectedDocument.enrichment.methodology_summary}
                                    </p>
                                  </div>
                                )}

                                {/* Topics & Concepts */}
                                {(selectedDocument.enrichment.key_concepts || selectedDocument.enrichment.related_topics) && (
                                  <div className="border-t pt-4">
                                    {selectedDocument.enrichment.key_concepts && selectedDocument.enrichment.key_concepts.length > 0 && (
                                      <div className="mb-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                          <span>💡</span> Key Concepts
                                        </h4>
                                        <Flex gap="sm" wrap="wrap">
                                          {selectedDocument.enrichment.key_concepts.map((concept, index) => (
                                            <Badge key={index} variant="info" size="sm">
                                              {concept}
                                            </Badge>
                                          ))}
                                        </Flex>
                                      </div>
                                    )}

                                    {selectedDocument.enrichment.related_topics && selectedDocument.enrichment.related_topics.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                          <span>🔗</span> Related Topics
                                        </h4>
                                        <Flex gap="sm" wrap="wrap">
                                          {selectedDocument.enrichment.related_topics.map((topic, index) => (
                                            <Badge key={index} variant="default" size="sm">
                                              {topic}
                                            </Badge>
                                          ))}
                                        </Flex>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Technical Terms - Collapsible */}
                                {selectedDocument.enrichment.technical_terms && selectedDocument.enrichment.technical_terms.length > 0 && (
                                  <details className="border-t pt-4">
                                    <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900 flex items-center gap-2">
                                      <span>📖</span> Technical Terms ({selectedDocument.enrichment.technical_terms.length})
                                    </summary>
                                    <Stack spacing="sm" className="mt-3">
                                      {selectedDocument.enrichment.technical_terms.slice(0, 5).map((item, index) => (
                                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                          <p className="text-sm font-semibold text-gray-900 mb-1">{item.term}</p>
                                          <p className="text-sm text-gray-600">{item.definition}</p>
                                        </div>
                                      ))}
                                    </Stack>
                                  </details>
                                )}

                                {/* Future Work */}
                                {selectedDocument.enrichment.future_work_suggestions && selectedDocument.enrichment.future_work_suggestions.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                      <span>🚀</span> Future Work
                                    </h4>
                                    <ul className="space-y-2 pl-4">
                                      {selectedDocument.enrichment.future_work_suggestions.map((suggestion, index) => (
                                        <li key={index} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                                          <span className="text-purple-500 flex-shrink-0">•</span>
                                          <span>{suggestion}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Citation Impact - Highlighted */}
                                {selectedDocument.enrichment.citation_impact_prediction && (
                                  <div className="border-t pt-4">
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <span>📊</span> Citation Impact Prediction
                                      </h4>
                                      <Stack spacing="sm">
                                        <Flex justify="between" align="center">
                                          <span className="text-sm text-gray-600">Predicted Citations</span>
                                          <span className="text-xl font-bold text-blue-600">
                                            {selectedDocument.enrichment.citation_impact_prediction.predicted_citations}
                                          </span>
                                        </Flex>
                                        <Flex justify="between" align="center">
                                          <span className="text-sm text-gray-600">Confidence</span>
                                          <span className="text-sm font-semibold text-blue-700">
                                            {(selectedDocument.enrichment.citation_impact_prediction.confidence * 100).toFixed(0)}%
                                          </span>
                                        </Flex>
                                        {selectedDocument.enrichment.citation_impact_prediction.reasoning && (
                                          <div className="mt-2 pt-2 border-t border-blue-200">
                                            <p className="text-sm text-gray-700 leading-relaxed italic">
                                              {selectedDocument.enrichment.citation_impact_prediction.reasoning}
                                            </p>
                                          </div>
                                        )}
                                      </Stack>
                                    </div>
                                  </div>
                                )}
                              </Stack>
                            ) : (
                              <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                </div>
                                <p className="text-sm text-gray-600 font-medium mb-1">No AI Insights Yet</p>
                                <p className="text-xs text-gray-500">AI-generated insights have not been created for this document</p>
                              </div>
                            )}
                          </TabsContent>

                          {selectedDocument.outline && Array.isArray(selectedDocument.outline) && selectedDocument.outline.length > 0 && (
                            <TabsContent value="outline" className="p-6">
                              <div className="space-y-1">
                                {selectedDocument.outline.map((item, index) => {
                                  const levelStyles = {
                                    0: 'font-semibold text-gray-900 text-base py-3 border-b border-gray-100',
                                    1: 'font-medium text-gray-800 text-sm py-2.5',
                                    2: 'font-normal text-gray-700 text-sm py-2',
                                    3: 'font-normal text-gray-600 text-sm py-1.5',
                                  }
                                  const levelStyle = levelStyles[item.level as keyof typeof levelStyles] || 'font-normal text-gray-600 text-sm py-1.5'

                                  return (
                                    <div
                                      key={index}
                                      className={`group hover:bg-gray-50 rounded-md px-3 -mx-3 transition-colors cursor-pointer ${levelStyle}`}
                                      style={{ paddingLeft: `${12 + item.level * 16}px` }}
                                    >
                                      <Flex justify="between" align="center" gap="sm">
                                        <div className="flex items-start gap-2 flex-1 min-w-0">
                                          {item.level === 0 && <span className="text-blue-600 flex-shrink-0">📑</span>}
                                          {item.level === 1 && <span className="text-gray-400 flex-shrink-0 text-xs">▸</span>}
                                          {item.level >= 2 && <span className="text-gray-300 flex-shrink-0 text-xs">•</span>}
                                          <span className="flex-1 break-words">{item.title}</span>
                                        </div>
                                        {item.page && (
                                          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded flex-shrink-0 group-hover:bg-white transition-colors">
                                            {item.page}
                                          </span>
                                        )}
                                      </Flex>
                                    </div>
                                  )
                                })}
                              </div>
                            </TabsContent>
                          )}
                        </div>
                      </Tabs>
                    </CardContent>
                  </Card>
                ) : null}
                </div>
              </div>
            )}
          </div>
        </Container>
      </div>
    </ErrorBoundary>
  )
}