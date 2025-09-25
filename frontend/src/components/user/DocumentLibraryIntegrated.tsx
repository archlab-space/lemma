'use client'

/**
 * Integrated Document Library Component
 * Uses real API endpoints to display and manage user's documents
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { documentsService } from '@/lib/api'
import { Document } from '@/lib/api/types'
import { Button, Input, Badge, Card, CardContent, LoadingState } from '@/components/ui'
import { Container, Grid, Flex, Stack } from '@/components/layout'
import { ErrorMessage } from '@/components/error'

interface DocumentLibraryIntegratedProps {
  onDocumentSelect?: (document: Document) => void
  onDocumentDelete?: (documentId: string) => void
  onRefresh?: () => void
  className?: string
}

export const DocumentLibraryIntegrated: React.FC<DocumentLibraryIntegratedProps> = ({ 
  onDocumentSelect, 
  onDocumentDelete,
  onRefresh,
  className = ''
}) => {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'uploading' | 'error'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'uploadedAt' | 'size'>('uploadedAt')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadDocuments = useCallback(async (reset = false) => {
    if (!user) return

    try {
      if (reset) {
        setLoading(true)
        setPage(1)
      }

      const response = await documentsService.getDocuments({
        page: reset ? 1 : page,
        limit: 12,
        status: filter === 'all' ? undefined : filter,
        search: searchTerm || undefined
      })

      const newDocuments = response.data || []
      
      if (reset) {
        setDocuments(newDocuments)
      } else {
        setDocuments(prev => [...prev, ...newDocuments])
      }

      setHasMore((response.pagination?.page || 1) < (response.pagination?.totalPages || 1))
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user, page, filter, searchTerm])

  // Initial load and when dependencies change
  useEffect(() => {
    loadDocuments(true)
  }, [filter, searchTerm])

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      loadDocuments(false)
    }
  }, [page])

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1)
    }
  }

  const handleRefresh = () => {
    loadDocuments(true)
    onRefresh?.()
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await documentsService.deleteDocument(documentId)
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      onDocumentDelete?.(documentId)
    } catch (err) {
      console.error('Failed to delete document:', err)
      // Show error notification
    }
  }

  const filteredAndSortedDocuments = documents
    .filter(doc => {
      const matchesSearch = searchTerm === '' || 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filter === 'all' || doc.status === filter

      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title)
        case 'uploadedAt':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        case 'size':
          return b.size - a.size
        default:
          return 0
      }
    })

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

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'completed': return 'success'
      case 'processing': return 'warning'
      case 'uploading': return 'info'
      case 'error': return 'error'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-4 h-4 text-yellow-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'uploading':
        return (
          <svg className="w-4 h-4 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  if (!user) {
    return (
      <Card variant="outlined" className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please sign in to view your documents.</p>
        </CardContent>
      </Card>
    )
  }

  if (loading && documents.length === 0) {
    return (
      <div className={className}>
        <LoadingState message="Loading your documents..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorMessage 
          message={error}
          onRetry={handleRefresh}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      <Stack spacing="lg">
        {/* Header and Controls */}
        <Card variant="outlined">
          <CardContent className="p-4">
            <Stack spacing="md">
              <Flex justify="between" align="center">
                <h2 className="text-lg font-semibold">Document Library</h2>
                <Flex gap="sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant={view === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setView('grid')}
                  >
                    Grid
                  </Button>
                  <Button
                    variant={view === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setView('list')}
                  >
                    List
                  </Button>
                </Flex>
              </Flex>

              <Flex gap="md" align="end">
                <div className="flex-1">
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Documents</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="uploading">Uploading</option>
                  <option value="error">Error</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="uploadedAt">Upload Date</option>
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                </select>
              </Flex>
            </Stack>
          </CardContent>
        </Card>

        {/* Documents Display */}
        {filteredAndSortedDocuments.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No documents match your search criteria.' : 'Upload your first PDF document to get started.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {view === 'grid' ? (
              <Grid cols={1} responsive={{ md: 2, lg: 3 }} gap="md">
                {filteredAndSortedDocuments.map((document) => (
                  <Card
                    key={document.id}
                    variant="outlined"
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onDocumentSelect?.(document)}
                  >
                    <CardContent className="p-4">
                      <Stack spacing="sm">
                        <Flex justify="between" align="start">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate" title={document.title}>
                              {document.title}
                            </h4>
                            <p className="text-sm text-gray-500 truncate" title={document.filename}>
                              {document.filename}
                            </p>
                          </div>
                          <Badge variant={getStatusColor(document.status)} size="sm">
                            {document.status}
                          </Badge>
                        </Flex>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatFileSize(document.size)}</span>
                          <span>•</span>
                          <span>{document.pageCount} pages</span>
                          <span>•</span>
                          <span>{formatDate(document.uploadedAt)}</span>
                        </div>

                        <Flex justify="between" align="center">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(document.status)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteDocument(document.id)
                            }}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </Flex>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            ) : (
              <Card variant="outlined">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Document
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Pages
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Uploaded
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedDocuments.map((document) => (
                        <tr
                          key={document.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => onDocumentSelect?.(document)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{document.title}</div>
                                <div className="text-sm text-gray-500">{document.filename}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(document.status)}
                              <Badge variant={getStatusColor(document.status)} size="sm" className="ml-2">
                                {document.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatFileSize(document.size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {document.pageCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(document.uploadedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDocument(document.id)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </Stack>
    </div>
  )
}

export default DocumentLibraryIntegrated