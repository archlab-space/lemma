'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import {Document} from '@/lib/api/types'

interface DocumentMetadataProps {
  document: Document
  onEdit?: () => void
  onExport?: () => void
  showEditButton?: boolean
  showExportButton?: boolean
  compact?: boolean
  className?: string
}

const DocumentMetadata: React.FC<DocumentMetadataProps> = ({
  document,
  onEdit,
  onExport,
  showEditButton = false,
  showExportButton = true,
  compact = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [isAbstractExpanded, setIsAbstractExpanded] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const renderKeywords = () => {
    if (!document.keywords || document.keywords.length === 0) return null

    return (
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Keywords</h4>
        <Flex gap="sm" wrap="wrap">
          {document.keywords.map((keyword, index) => (
            <Badge key={index} variant="default" size="sm">
              {keyword}
            </Badge>
          ))}
        </Flex>
      </div>
    )
  }

  const renderAuthors = () => {
    if (!document.authors || document.authors.length === 0) return null

    return (
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-1">Authors</h4>
        <p className="text-sm text-gray-700">
          {document.authors.join(', ')}
        </p>
      </div>
    )
  }

  const renderAbstract = () => {
    if (!document.abstract) return null

    const shouldTruncate = document.abstract.length > 300

    return (
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Abstract</h4>
        <div className="text-sm text-gray-700 leading-relaxed">
          {shouldTruncate && !isAbstractExpanded ? (
            <>
              {document.abstract.substring(0, 300)}...
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAbstractExpanded(true)}
                className="ml-1 p-0 h-auto text-blue-600 hover:text-blue-700"
              >
                Read more
              </Button>
            </>
          ) : (
            <>
              {document.abstract}
              {shouldTruncate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAbstractExpanded(false)}
                  className="ml-1 p-0 h-auto text-blue-600 hover:text-blue-700"
                >
                  Show less
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  const renderPublicationInfo = () => {
    if (!document.journal && !document.publicationYear && !document.doi) return null

    return (
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Publication</h4>
        <Stack spacing="xs" className="text-sm text-gray-700">
          {document.journal && (
            <p><span className="font-medium">Journal:</span> {document.journal}</p>
          )}
          {document.publicationYear && (
            <p><span className="font-medium">Year:</span> {document.publicationYear}</p>
          )}
          {document.doi && (
            <Flex gap="sm" align="center">
              <span className="font-medium">DOI:</span>
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                {document.doi}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(document.doi!)}
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Copy DOI"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Button>
            </Flex>
          )}
        </Stack>
      </div>
    )
  }

  const renderFileInfo = () => (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-2">File Information</h4>
      <Stack spacing="xs" className="text-sm text-gray-700">
        <Flex justify="between">
          <span>Pages:</span>
          <span>{document.totalPages}</span>
        </Flex>
        <Flex justify="between">
          <span>File Size:</span>
          <span>{formatFileSize(document.fileSizeBytes)}</span>
        </Flex>
        {document.language && (
          <Flex justify="between">
            <span>Language:</span>
            <span>{document.language}</span>
          </Flex>
        )}
        <Flex justify="between">
          <span>Uploaded:</span>
          <span>{formatDate(document.createdAt)}</span>
        </Flex>
        {document.processingStartedAt && (
          <Flex justify="between">
            <span>Processed:</span>
            <span>{formatDate(document.processingStartedAt)}</span>
          </Flex>
        )}
      </Stack>
    </div>
  )

  const renderStats = () => {
    // TODO: add citations or references extraction
    return null
    // if (!metadata.citations && !metadata.references) return null

    // return (
    //   <div>
    //     <h4 className="text-sm font-medium text-gray-900 mb-2">Statistics</h4>
    //     <Stack spacing="xs" className="text-sm text-gray-700">
    //       {metadata.citations && (
    //         <Flex justify="between">
    //           <span>Citations:</span>
    //           <span>{metadata.citations}</span>
    //         </Flex>
    //       )}
    //       {metadata.references && (
    //         <Flex justify="between">
    //           <span>References:</span>
    //           <span>{metadata.references}</span>
    //         </Flex>
    //       )}
    //     </Stack>
    //   </div>
    // )
  }

  return (
    <Card variant="outlined" className={className}>
      <CardHeader className="pb-2">
        <Flex justify="between" align="start">
          <CardTitle className="text-base">Document Information</CardTitle>
          
          <Flex gap="sm">
            {showEditButton && onEdit && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                Edit
              </Button>
            )}
            {showExportButton && onExport && (
              <Button size="sm" variant="outline" onClick={onExport}>
                Export
              </Button>
            )}
            {compact && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            )}
          </Flex>
        </Flex>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <Stack spacing="lg">
            {/* Title */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                {document.title}
              </h3>
            </div>

            {/* Authors */}
            {renderAuthors()}

            {/* Abstract */}
            {renderAbstract()}

            {/* Publication Info */}
            {renderPublicationInfo()}

            {/* Keywords */}
            {renderKeywords()}

            {/* File Info */}
            {renderFileInfo()}

            {/* Statistics */}
            {renderStats()}
          </Stack>
        </CardContent>
      )}
    </Card>
  )
}

export default DocumentMetadata