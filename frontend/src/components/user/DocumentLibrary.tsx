'use client'

/**
 * Document Library Component
 * Displays and manages user's uploaded documents
 */

import React, { useState } from 'react'
import { Button, Input, Badge, Card, CardContent, LoadingState } from '@/components/ui'
import { Container, Grid, Flex, Stack } from '@/components/layout'
import { ErrorMessage } from '@/components/error'

interface Document {
  id: string
  name: string
  type: string
  size: number
  uploadDate: Date
  processedDate?: Date
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  pageCount?: number
  questionsCount?: number
  thumbnail?: string
}

interface DocumentLibraryProps {
  documents?: Document[]
  onDocumentSelect?: (document: Document) => void
  onDocumentDelete?: (documentId: string) => void
}

export function DocumentLibrary({ 
  documents, 
  onDocumentSelect, 
  onDocumentDelete 
}: DocumentLibraryProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')

  // Demo documents
  const defaultDocuments: Document[] = [
    {
      id: '1',
      name: 'Machine Learning Fundamentals.pdf',
      type: 'application/pdf',
      size: 2457600, // 2.4 MB
      uploadDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
      processedDate: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
      status: 'completed',
      pageCount: 45,
      questionsCount: 12,
    },
    {
      id: '2',
      name: 'Neural Networks in Python.pdf',
      type: 'application/pdf',
      size: 5242880, // 5 MB
      uploadDate: new Date(Date.now() - 5 * 60 * 60 * 1000),
      processedDate: new Date(Date.now() - 4 * 60 * 60 * 1000),
      status: 'completed',
      pageCount: 78,
      questionsCount: 8,
    },
    {
      id: '3',
      name: 'Deep Learning Research.pdf',
      type: 'application/pdf',
      size: 8388608, // 8 MB
      uploadDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: 'processing',
      pageCount: 120,
    },
    {
      id: '4',
      name: 'Computer Vision Basics.pdf',
      type: 'application/pdf',
      size: 3145728, // 3 MB
      uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'failed',
      pageCount: 56,
    },
  ]

  const userDocuments = documents || defaultDocuments

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    )
  }

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-5 h-5 text-yellow-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'uploading':
        return (
          <svg className="w-5 h-5 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        )
      default:
        return null
    }
  }

  const filteredDocuments = userDocuments
    .filter(doc => {
      if (filter !== 'all' && doc.status !== filter) return false
      if (searchTerm && !doc.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return b.size - a.size
        case 'date':
        default:
          return b.uploadDate.getTime() - a.uploadDate.getTime()
      }
    })

  const GridView = () => (
    <Grid cols={1} responsive={{ md: 2, lg: 3, xl: 4 }} gap="lg">
      {filteredDocuments.map((doc) => (
        <Card
          key={doc.id}
          variant="elevated"
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onDocumentSelect?.(doc)}
        >
          <CardContent className="p-4">
            <Flex justify="between" align="start" className="mb-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <Flex gap="sm" align="center">
                <Badge variant={doc.status === 'completed' ? 'success' : doc.status === 'processing' ? 'warning' : doc.status === 'failed' ? 'error' : 'default'}>
                  {doc.status}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDocumentDelete?.(doc.id)
                  }}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </Flex>
            </Flex>
            <h3 className="text-sm font-medium text-gray-900 truncate mb-2">{doc.name}</h3>
            <Stack spacing="xs" className="text-xs text-gray-500">
              <p>{formatFileSize(doc.size)}</p>
              {doc.pageCount && <p>{doc.pageCount} pages</p>}
              {doc.questionsCount && <p>{doc.questionsCount} questions</p>}
              <p>Uploaded {formatDate(doc.uploadDate)}</p>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Grid>
  )

  const ListView = () => (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Document
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pages
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Uploaded
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredDocuments.map((doc) => (
            <tr
              key={doc.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onDocumentSelect?.(doc)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                    {doc.questionsCount && (
                      <div className="text-sm text-gray-500">{doc.questionsCount} questions asked</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {getStatusIcon(doc.status)}
                  <span className="ml-2 text-sm text-gray-900 capitalize">{doc.status}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatFileSize(doc.size)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {doc.pageCount || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(doc.uploadDate)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDocumentDelete?.(doc.id)
                  }}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <Container size="xl">
      <Stack spacing="lg">
        {/* Header */}
        <Flex justify="between" align="start" className="flex-col sm:flex-row gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Document Library</h2>
            <p className="text-sm text-gray-500 mt-1">
              {filteredDocuments.length} of {userDocuments.length} documents
            </p>
          </div>
          <Button variant="primary">
            Upload Document
          </Button>
        </Flex>

        {/* Filters and Controls */}
        <Flex direction="col" gap="md" className="sm:flex-row">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Documents</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
          </select>
          <Flex className="border border-gray-300 rounded-md overflow-hidden">
            <Button
              variant={view === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setView('grid')}
              className="rounded-none border-r border-gray-300"
            >
              Grid
            </Button>
            <Button
              variant={view === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="rounded-none"
            >
              List
            </Button>
          </Flex>
        </Flex>

        {/* Documents */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500">Upload your first document to get started</p>
          </div>
        ) : (
          view === 'grid' ? <GridView /> : <ListView />
        )}
      </Stack>
    </Container>
  )
}