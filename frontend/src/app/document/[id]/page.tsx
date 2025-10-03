'use client'

/**
 * Document Viewer Page
 * Comprehensive document viewing with outline, metadata, summary, and chat
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DocumentOutline  from '@/components/document/DocumentOutline'
import DocumentMetadata from '@/components/document/DocumentMetadata'
import DocumentSummary from '@/components/document/DocumentSummary'
import DocumentSearch from '@/components/document/DocumentSearch'
import DeleteDocumentDialog from '@/components/document/DeleteDocumentDialog'
import StreamingChatIntegrated from '@/components/chat/StreamingChatIntegrated'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Container, Grid, Stack, Flex } from '@/components/layout'
import { ErrorBoundary } from '@/components/error'
import Link from 'next/link'

import type { Document as APIDocument } from '@/lib/api/types'

type ViewMode = 'overview' | 'outline' | 'summary' | 'search' | 'chat'

export default function DocumentViewerPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const documentId = params?.id as string
  
  const [document, setDocument] = useState<APIDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewMode>('overview')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Fetch document data from API
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true)

        const { documentsService } = await import('@/lib/api/documents')
        const doc = await documentsService.getDocument(documentId)
        setDocument(doc)
      } catch (err) {
        console.error('Failed to load document:', err)
        setError('Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    if (documentId) {
      fetchDocument()
    }
  }, [documentId])

  const handleDeleteDocument = async (docId: string) => {
    const { documentsService } = await import('@/lib/api/documents')
    await documentsService.deleteDocument(docId)
  }

  const handleDeleteSuccess = () => {
    router.push('/')
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

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(dateObj)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Stack align="center" spacing="md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading document...</p>
        </Stack>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Stack align="center" spacing="md">
          <div className="text-red-500">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Document Not Found</h2>
          <p className="text-gray-600">The requested document could not be found or loaded.</p>
        </Stack>
      </div>
    )
  }

  const views = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'outline', name: 'Outline', icon: '📑' },
    { id: 'summary', name: 'Summary', icon: '📝' },
    { id: 'search', name: 'Search', icon: '🔍' },
    { id: 'chat', name: 'Chat', icon: '💬' },
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
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
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                    {document.title}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{document.filename}</span>
                    <span>•</span>
                    <span>{document.totalPages} pages</span>
                    <span>•</span>
                    <span>{formatFileSize(document.fileSizeBytes)}</span>
                  </div>
                </div>
              </Flex>
              
              <Flex align="center" gap="md">
                <Badge
                  variant={document.processingStatus === 'completed' ? 'success' : document.processingStatus === 'processing' ? 'warning' : 'error'}
                  size="sm"
                >
                  {document.processingStatus === 'completed' ? '✓ Processed' :
                   document.processingStatus === 'processing' ? '⏳ Processing' :
                   '⚠ Error'}
                </Badge>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete
                </Button>
              </Flex>
            </Flex>
          </Container>
        </nav>

        <Container size="xl" className="py-6">
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* Sidebar */}
            <div className={`transition-all duration-200 ${isSidebarCollapsed ? 'col-span-1' : 'col-span-3'}`}>
              <div className="sticky top-6">
                <Card variant="outlined" className="h-fit">
                  <CardHeader className="pb-3">
                    <Flex justify="between" align="center">
                      {!isSidebarCollapsed && <CardTitle className="text-base">Navigation</CardTitle>}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="p-1"
                      >
                        <svg className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                      </Button>
                    </Flex>
                  </CardHeader>
                  
                  <CardContent>
                    <Stack spacing="xs">
                      {views.map((view) => (
                        <Button
                          key={view.id}
                          variant={activeView === view.id ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setActiveView(view.id as ViewMode)}
                          className={`justify-start ${isSidebarCollapsed ? 'px-2' : 'px-3'}`}
                          title={isSidebarCollapsed ? view.name : undefined}
                        >
                          <span className="mr-2">{view.icon}</span>
                          {!isSidebarCollapsed && view.name}
                        </Button>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content */}
            <div className={`${isSidebarCollapsed ? 'col-span-11' : 'col-span-9'}`}>
              {activeView === 'overview' && (
                <Stack spacing="lg">
                  <DocumentMetadata
                    document={document}
                    className="mb-6"
                  />
                  
                  <Grid cols={1} responsive={{ lg: 2 }} gap="lg">
                    <DocumentSummary
                      enrichment={document.enrichment}
                      abstract={document.abstract}
                      compact={true}
                    />

                    <DocumentOutline
                      outline={document.outline}
                    />
                  </Grid>
                </Stack>
              )}

              {activeView === 'outline' && (
                <DocumentOutline
                  outline={document.outline}
                />
              )}

              {activeView === 'summary' && (
                <DocumentSummary
                  enrichment={document.enrichment}
                  abstract={document.abstract}
                />
              )}

              {activeView === 'search' && (
                <DocumentSearch
                  documentId={document.id}
                  onResultClick={(result) => console.log('Navigate to result:', result)}
                />
              )}

              {activeView === 'chat' && (
                <StreamingChatIntegrated
                  documentId={document.id}
                  conversationId=''
                  onMessageSent={(message) => console.log('Message sent:', message)}
                  onMessageReceived={(message) => console.log('Message received:', message)}
                  onError={(error) => console.error('Chat error:', error)}
                  placeholder={`Ask a question about "${document.title}"`}
                  className="h-[600px]"
                />
              )}
            </div>
          </div>
        </Container>

        {/* Delete Dialog */}
        {document && (
          <DeleteDocumentDialog
            document={document}
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            onConfirm={handleDeleteDocument}
            onSuccess={handleDeleteSuccess}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}