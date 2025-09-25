'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, Badge, Button } from '@/components/ui'
import { Flex, Stack } from '@/components/layout'
import { LoadingState } from '@/components/ui'

interface FilePreviewProps {
  file: File
  onRemove?: () => void
  showMetadata?: boolean
  className?: string
}

interface FileMetadata {
  name: string
  size: number
  type: string
  lastModified: Date
  pageCount?: number
  title?: string
  author?: string
}

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  showMetadata = true,
  className = '',
}) => {
  const [metadata, setMetadata] = useState<FileMetadata | null>(null)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const extractMetadata = async () => {
      try {
        setLoading(true)
        setError(null)

        // Basic file metadata
        const basicMetadata: FileMetadata = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date(file.lastModified),
        }

        // For PDFs, try to extract additional metadata
        if (file.type === 'application/pdf') {
          try {
            // Create a thumbnail (placeholder for now - would need PDF.js or similar)
            const thumbnailUrl = await generatePDFThumbnail(file)
            setThumbnail(thumbnailUrl)

            // Extract PDF metadata (placeholder - would use PDF.js)
            const pdfMetadata = await extractPDFMetadata(file)
            setMetadata({ ...basicMetadata, ...pdfMetadata })
          } catch (pdfError) {
            console.warn('Could not extract PDF metadata:', pdfError)
            setMetadata(basicMetadata)
          }
        } else {
          setMetadata(basicMetadata)
        }
      } catch (err) {
        setError('Failed to extract file metadata')
        setMetadata({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date(file.lastModified),
        })
      } finally {
        setLoading(false)
      }
    }

    extractMetadata()
  }, [file])

  // Placeholder function - would implement with PDF.js
  const generatePDFThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // Placeholder - return a default PDF icon as data URL
      const canvas = document.createElement('canvas')
      canvas.width = 120
      canvas.height = 160
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        // Draw a simple PDF representation
        ctx.fillStyle = '#f3f4f6'
        ctx.fillRect(0, 0, 120, 160)
        
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(10, 10, 100, 20)
        
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('PDF', 60, 24)
        
        // Add some lines to simulate content
        ctx.fillStyle = '#d1d5db'
        for (let i = 0; i < 8; i++) {
          ctx.fillRect(20, 45 + i * 12, 80, 2)
        }
        
        resolve(canvas.toDataURL())
      } else {
        resolve('')
      }
    })
  }

  // Placeholder function - would implement with PDF.js
  const extractPDFMetadata = async (file: File): Promise<Partial<FileMetadata>> => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      pageCount: Math.floor(Math.random() * 100) + 10, // Random page count for demo
      title: file.name.replace('.pdf', '').replace(/[-_]/g, ' '),
      author: 'Unknown Author',
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileTypeIcon = () => {
    if (file.type === 'application/pdf') {
      return (
        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )
    }

    return (
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    )
  }

  if (loading) {
    return (
      <Card variant="outlined" className={className}>
        <CardContent className="p-4">
          <LoadingState size="sm" message="Analyzing file..." />
        </CardContent>
      </Card>
    )
  }

  if (error || !metadata) {
    return (
      <Card variant="outlined" className={className}>
        <CardContent className="p-4">
          <Flex justify="between" align="center">
            <Flex gap="md" align="center">
              {getFileTypeIcon()}
              <div>
                <h4 className="text-sm font-medium text-gray-900">{file.name}</h4>
                <p className="text-xs text-red-600">{error || 'Could not read file'}</p>
              </div>
            </Flex>
            {onRemove && (
              <Button size="sm" variant="ghost" onClick={onRemove}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
          </Flex>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="outlined" className={className}>
      <CardContent className="p-4">
        <Flex gap="md" align="start">
          {/* Thumbnail or icon */}
          <div className="flex-shrink-0">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={`Preview of ${metadata.name}`}
                className="w-16 h-20 object-cover rounded border bg-gray-50"
              />
            ) : (
              <div className="w-16 h-20 bg-gray-100 rounded border flex items-center justify-center">
                {getFileTypeIcon()}
              </div>
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <Flex justify="between" align="start">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                  {metadata.title || metadata.name}
                </h4>
                
                {showMetadata && (
                  <Stack spacing="xs" className="text-xs text-gray-500">
                    <p>{formatFileSize(metadata.size)}</p>
                    {metadata.pageCount && (
                      <p>{metadata.pageCount} pages</p>
                    )}
                    {metadata.author && (
                      <p>by {metadata.author}</p>
                    )}
                    <p>Modified: {metadata.lastModified.toLocaleDateString()}</p>
                  </Stack>
                )}

                <div className="mt-2">
                  <Badge variant="default" size="sm">
                    {metadata.type === 'application/pdf' ? 'PDF' : 'Document'}
                  </Badge>
                </div>
              </div>

              {onRemove && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onRemove}
                  className="ml-2 text-gray-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </Flex>
          </div>
        </Flex>
      </CardContent>
    </Card>
  )
}

export default FilePreview