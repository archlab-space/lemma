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
import DocumentDetailsPanel from '@/components/document/DocumentDetailsPanel'
import { toast } from 'sonner'

interface DocumentWithConversations extends Document {
  recentConversations?: ChatConversation[]
  conversationCount?: number
}

export default function HomePage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { state, loadDocuments } = useApp()
  const router = useRouter()

  const [selectedDocument, setSelectedDocument] = useState<DocumentWithConversations | null>(null)
  const [view, setView] = useState<'documents' | 'upload' | 'sessions'>('documents')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date')

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
      toast.error('Could not create a new chat session')
    }
  }

  const handleContinueConversation = (conversationId: string) => {
    router.push(`/chat/${conversationId}`)
  }

  const handleRetryProcessing = async (documentId: string) => {
    try {
      await documentsService.triggerProcessing(documentId)
      toast.success('Document processing started')
      // Refresh documents to show updated status
      loadDocuments()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to trigger document processing'
      toast.error(errorMessage)
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
                              toast.success(`${document.title || document.filename} is being processed`)
                              loadDocuments() // Refresh documents through AppContext
                              setView('documents') // Switch back to documents view
                            }}
                            onUploadError={(file: UploadingFile, error: string) => {
                              toast.error(`Failed to upload ${file.name}: ${error}`)
                            }}
                            onUploadStart={(file: UploadingFile) => {
                              toast.info(`Processing ${file.name}...`)
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
                  <DocumentDetailsPanel
                    document={selectedDocument}
                    onClose={() => setSelectedDocument(null)}
                  />
                </div>
              </div>
            )}
          </div>
        </Container>
      </div>
    </ErrorBoundary>
  )
}