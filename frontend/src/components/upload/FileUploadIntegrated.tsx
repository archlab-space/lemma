'use client'

/**
 * Integrated File Upload Component
 * Uses real API endpoints for document upload and processing
 */

import React, { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { documentsService } from '@/lib/api'
import { Document, DocumentUploadRequest, DocumentProcessingStatus } from '@/lib/api/types'
import { Button, Badge, Card, CardContent, LoadingState } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { ErrorMessage } from '@/components/error'
import { DragDropUpload } from '@/components/upload'
import { UploadQueue } from '@/components/upload'

interface UploadingFile {
  id: string
  name: string
  size: number
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  file?: File
  documentId?: string
}

interface FileUploadIntegratedProps {
  onUploadComplete?: (document: Document) => void
  onUploadError?: (file: UploadingFile, error: string) => void
  onUploadStart?: (file: UploadingFile) => void
  maxFileSize?: number
  allowMultiple?: boolean
  acceptedTypes?: string[]
  className?: string
}

const FileUploadIntegrated: React.FC<FileUploadIntegratedProps> = ({
  onUploadComplete,
  onUploadError,
  onUploadStart,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  allowMultiple = true,
  acceptedTypes = ['.pdf', 'application/pdf'],
  className = ''
}) => {
  const { user } = useAuth()
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const abortControllers = useRef<Map<string, AbortController>>(new Map())

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase())
      }
      return file.type === type
    })

    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`
    }

    return null
  }, [maxFileSize, acceptedTypes])

  const handleFilesSelected = useCallback(async (files: FileList) => {
    if (!user) {
      console.error('User not authenticated')
      return
    }

    const newFiles: UploadingFile[] = []

    Array.from(files).forEach(file => {
      const validationError = validateFile(file)
      
      const uploadFile: UploadingFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        progress: 0,
        status: validationError ? 'error' : 'pending',
        error: validationError || undefined,
        file: validationError ? undefined : file
      }

      newFiles.push(uploadFile)
    })

    setUploadingFiles(prev => [...prev, ...newFiles])

    // Start uploading valid files
    for (const uploadFile of newFiles) {
      if (uploadFile.status === 'pending' && uploadFile.file) {
        onUploadStart?.(uploadFile)
        uploadDocument(uploadFile)
      } else if (uploadFile.error) {
        onUploadError?.(uploadFile, uploadFile.error)
      }
    }
  }, [user, validateFile, onUploadStart, onUploadError])

  const uploadDocument = useCallback(async (uploadFile: UploadingFile) => {
    if (!uploadFile.file) return

    const abortController = new AbortController()
    abortControllers.current.set(uploadFile.id, abortController)

    try {
      // Update status to uploading
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading' }
          : f
      ))

      // Step 1: Request upload URL
      const uploadRequest: DocumentUploadRequest = {
        filename: uploadFile.file.name,
        size: uploadFile.file.size,
        contentType: uploadFile.file.type
      }

      const uploadResponse = await documentsService.requestUpload(uploadRequest)

      // Update with document ID
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, documentId: uploadResponse.documentId }
          : f
      ))

      // Step 2: Upload file to R2
      await documentsService.uploadFile(
        uploadResponse.uploadUrl,
        uploadFile.file,
        uploadResponse.fields,
        (progress) => {
          setUploadingFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, progress: Math.round(progress * 0.7) } // Reserve 30% for processing
              : f
          ))
        },
        abortController.signal
      )

      // Step 3: Complete upload and start processing
      await documentsService.completeUpload(uploadResponse.documentId)

      // Update status to processing
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'processing', progress: 70 }
          : f
      ))

      // Step 4: Poll for processing status
      const cancelPolling = documentsService.pollProcessingStatus(
        uploadResponse.documentId,
        (status: DocumentProcessingStatus) => {
          // Update progress during processing
          const progressPercent = 70 + (status.progress * 0.3) // 70-100%
          
          setUploadingFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { 
                  ...f, 
                  progress: Math.round(progressPercent),
                  status: status.status === 'processing' ? 'processing' : status.status
                }
              : f
          ))
        },
        async (document: Document) => {
          // Processing completed successfully
          setUploadingFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'completed', progress: 100 }
              : f
          ))

          onUploadComplete?.(document)
          abortControllers.current.delete(uploadFile.id)
        },
        (error: Error) => {
          // Processing failed
          setUploadingFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'error', error: error.message }
              : f
          ))

          onUploadError?.(uploadFile, error.message)
          abortControllers.current.delete(uploadFile.id)
        }
      )

      // Store cancel function for potential cleanup
      abortController.signal.addEventListener('abort', () => {
        cancelPolling()
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ))

      onUploadError?.(uploadFile, errorMessage)
      abortControllers.current.delete(uploadFile.id)
    }
  }, [onUploadComplete, onUploadError])

  const handleRetryUpload = useCallback((fileId: string) => {
    const file = uploadingFiles.find(f => f.id === fileId)
    if (file && file.file) {
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'pending', progress: 0, error: undefined }
          : f
      ))
      uploadDocument({ ...file, status: 'pending', progress: 0, error: undefined })
    }
  }, [uploadingFiles, uploadDocument])

  const handleCancelUpload = useCallback((fileId: string) => {
    const controller = abortControllers.current.get(fileId)
    if (controller) {
      controller.abort()
      abortControllers.current.delete(fileId)
    }

    setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  const handleRemoveFile = useCallback((fileId: string) => {
    handleCancelUpload(fileId)
  }, [handleCancelUpload])

  const handleClearCompleted = useCallback(() => {
    setUploadingFiles(prev => prev.filter(f => f.status !== 'completed'))
  }, [])

  if (!user) {
    return (
      <Card variant="outlined" className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please sign in to upload documents.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Stack spacing="lg">
        {/* Upload Area */}
        <DragDropUpload
          onFilesSelected={handleFilesSelected}
          accept={acceptedTypes.join(',')}
          multiple={allowMultiple}
          maxSize={maxFileSize}
          helperText={`Upload PDF documents up to ${Math.round(maxFileSize / (1024 * 1024))}MB each`}
          showFileCount={true}
        />

        {/* Upload Queue */}
        {uploadingFiles.length > 0 && (
          <Card variant="outlined">
            <CardContent className="p-4">
              <UploadQueue
                files={uploadingFiles}
                onRetry={handleRetryUpload}
                onRemove={handleRemoveFile}
                onClearCompleted={handleClearCompleted}
                showBatchActions={true}
              />
            </CardContent>
          </Card>
        )}
      </Stack>
    </div>
  )
}

export default FileUploadIntegrated