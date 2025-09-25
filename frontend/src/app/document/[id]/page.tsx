'use client'

/**
 * Document Viewer Page
 * Comprehensive document viewing with outline, metadata, summary, and chat
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { DocumentOutline } from '@/components/document/DocumentOutline'
import { DocumentMetadata } from '@/components/document/DocumentMetadata'
import { DocumentSummary } from '@/components/document/DocumentSummary'
import { DocumentSearch } from '@/components/document/DocumentSearch'
import { DeleteDocumentDialog } from '@/components/document/DeleteDocumentDialog'
import { StreamingChat } from '@/components/chat/StreamingChat'
import { StreamingChatIntegrated } from '@/components/chat/StreamingChatIntegrated'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Container, Grid, Stack, Flex } from '@/components/layout'
import { ErrorBoundary } from '@/components/error'
import Link from 'next/link'

interface Document {
  id: string
  title: string
  filename: string
  size: number
  pageCount: number
  uploadedAt: Date
  processedAt?: Date
  status: 'processing' | 'completed' | 'error'
  metadata?: {
    authors?: string[]
    abstract?: string
    keywords?: string[]
    doi?: string
    journal?: string
    year?: number
  }
}

type ViewMode = 'overview' | 'outline' | 'summary' | 'search' | 'chat'

export default function DocumentViewerPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const documentId = params?.id as string
  
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewMode>('overview')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true)
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockDocument: Document = {
          id: documentId,
          title: 'Deep Learning for Natural Language Processing: A Comprehensive Survey',
          filename: 'deep_learning_nlp_survey.pdf',
          size: 2.4 * 1024 * 1024, // 2.4 MB
          pageCount: 42,
          uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30000), // 30 seconds later
          status: 'completed',
          metadata: {
            authors: ['Sarah Chen', 'Michael Rodriguez', 'Dr. Lisa Wang'],
            abstract: 'This comprehensive survey explores the latest advances in deep learning approaches for natural language processing tasks. We examine state-of-the-art architectures, training methodologies, and evaluation metrics across various NLP applications including language modeling, machine translation, and text classification.',
            keywords: ['deep learning', 'natural language processing', 'transformers', 'BERT', 'GPT'],
            doi: '10.1234/example.2024.001',
            journal: 'Journal of Machine Learning Research',
            year: 2024
          }
        }
        
        setDocument(mockDocument)
      } catch (err) {
        setError('Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    if (documentId) {
      fetchDocument()
    }
  }, [documentId])

  const handleDeleteDocument = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Document deleted:', documentId)
      router.push('/dashboard?tab=documents')
    } catch (err) {
      console.error('Failed to delete document:', err)
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
          <Button asChild>
            <Link href="/dashboard?tab=documents">Back to Documents</Link>
          </Button>
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
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Dashboard
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
                    <span>{document.pageCount} pages</span>
                    <span>•</span>
                    <span>{formatFileSize(document.size)}</span>
                  </div>
                </div>
              </Flex>
              
              <Flex align="center" gap="md">
                <Badge 
                  variant={document.status === 'completed' ? 'success' : document.status === 'processing' ? 'warning' : 'error'}
                  size="sm"
                >
                  {document.status === 'completed' ? '✓ Processed' : 
                   document.status === 'processing' ? '⏳ Processing' : 
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
                          variant={activeView === view.id ? 'default' : 'ghost'}
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
                    showFullMetadata={true}
                    className="mb-6"
                  />
                  
                  <Grid cols={1} responsive={{ lg: 2 }} gap="lg">
                    <DocumentSummary 
                      documentId={document.id}
                      showActions={true}
                      expandable={false}
                    />
                    
                    <DocumentOutline 
                      documentId={document.id}
                      onSectionClick={(section) => console.log('Navigate to:', section)}
                      showSearch={false}
                      maxHeight="400px"
                    />
                  </Grid>
                </Stack>
              )}

              {activeView === 'outline' && (
                <DocumentOutline 
                  documentId={document.id}
                  onSectionClick={(section) => console.log('Navigate to:', section)}
                  showSearch={true}
                  expandable={true}
                />
              )}

              {activeView === 'summary' && (
                <DocumentSummary 
                  documentId={document.id}
                  showActions={true}
                  expandable={true}
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
                  onSessionCreated={(session) => console.log('Chat session created:', session)}
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
        <DeleteDocumentDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteDocument}
          documentTitle={document.title}
        />
      </div>
    </ErrorBoundary>
  )
}