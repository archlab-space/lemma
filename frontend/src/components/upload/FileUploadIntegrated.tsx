'use client'

/**
 * Integrated File Upload Component
 * Uses real API endpoints for document upload and processing
 */

import React, { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { documentsService } from '@/lib/api'
import { Document, DocumentUploadRequest, DocumentProcessingStatus, UploadingFile } from '@/lib/api/types'
import { Button, Badge, Card, CardContent, LoadingState } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { ErrorMessage } from '@/components/error'
import { DragDropUpload } from '@/components/upload'
import { UploadQueue } from '@/components/upload'

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

    // Check if file already exists in current upload queue
    const existingFile = uploadingFiles.find(f => f.name === file.name && f.size === file.size)
    if (existingFile) {
      return 'This file is already being uploaded'
    }

    return null
  }, [maxFileSize, acceptedTypes, uploadingFiles])

  // Calculate file hash for duplicate detection
  const calculateFileHash = useCallback(async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }, [])

  // Check if file is duplicate using the API
  const checkDuplicate = useCallback(async (fileHash: string) => {
    try {
      return await documentsService.checkDuplicate(fileHash)
    } catch (error) {
      console.error('Error checking duplicate:', error)
      throw error
    }
  }, [])

  const uploadDocument = useCallback(async (uploadFile: UploadingFile) => {
    if (!uploadFile.file) return

    const abortController = new AbortController()
    abortControllers.current.set(uploadFile.id, abortController)

    try {
      // Update status to uploading
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ))

      // Step 1: Calculate file hash for duplicate detection
      console.log('Calculating file hash for:', uploadFile.file.name)
      const fileHash = await calculateFileHash(uploadFile.file)
      console.log('File hash calculated:', fileHash)

      // Update progress after hash calculation
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, progress: 20 }
          : f
      ))

      // Step 2: Check for duplicates
      console.log('Checking for duplicates...')
      const duplicateCheck = await checkDuplicate(fileHash)
      
      if (duplicateCheck.isDuplicate && duplicateCheck.existingDocument && duplicateCheck.existingDocument.processingStatus !== 'pending') {
        throw new Error(`This document has already been uploaded: "${duplicateCheck.existingDocument.originalFilename || duplicateCheck.existingDocument.filename}"`)
      }

      // If duplicate but failed/pending, we'll retry using existing document
      const isRetry = duplicateCheck.isDuplicate && duplicateCheck.existingDocument && duplicateCheck.existingDocument.processingStatus === 'pending'

      let documentId: string
      let uploadUrl: string

      if (isRetry) {
        console.log('Retrying previous upload for existing document...')
        documentId = duplicateCheck.existingDocument!.id
        
        // Generate new presigned URL for retry using existing document metadata
        const uploadRequest: DocumentUploadRequest = {
          filename: uploadFile.file.name,
          fileSize: uploadFile.file.size,
          fileType: uploadFile.file.type,
          fileHash,
          documentId: documentId
        }
        
        const uploadResponse = await documentsService.requestUpload(uploadRequest)
        uploadUrl = uploadResponse.uploadUrl
      } else {
        // Step 3: Request upload URL first to get storage details
        console.log('Requesting upload URL...')
        const uploadRequest: DocumentUploadRequest = {
          filename: uploadFile.file.name,
          fileSize: uploadFile.file.size,
          fileType: uploadFile.file.type,
          fileHash
        }

        const uploadResponse = await documentsService.requestUpload(uploadRequest)
        uploadUrl = uploadResponse.uploadUrl

        // Step 4: Create document record with storage path from upload response
        console.log('Creating document record...')
        const createRequest: DocumentUploadRequest = {
          filename: uploadResponse.sanitizedFileName,
          fileSize: uploadFile.file.size,
          fileType: uploadFile.file.type,
          fileHash,
          originalFilename: uploadFile.file.name,
          fileSizeBytes: uploadFile.file.size,
          mimeType: uploadFile.file.type,
          storagePath: uploadResponse.storagePath,
          documentId: uploadResponse.documentId
        }

        const documentResponse = await documentsService.createDocument(createRequest)
        documentId = documentResponse.document.id
      }

      // Update progress after URL generation
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, progress: 30 }
          : f
      ))

      // Update with document ID
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, documentId }
          : f
      ))

      // Step 5: Upload file to R2
      console.log('Uploading file to R2...')
      await documentsService.uploadFile(
        uploadUrl,
        uploadFile.file,
        (progress) => {
          // Map upload progress to 30-70% range
          const adjustedProgress = 30 + (progress * 0.4)
          setUploadingFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, progress: Math.round(adjustedProgress) }
              : f
          ))
        },
        abortController.signal
      )

      // Step 6: Trigger document processing  
      console.log('Triggering document processing...')
      await documentsService.triggerProcessing(documentId)

      // Update status to processing (backend confirms processing started)
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'processing', progress: 70 }
          : f
      ))

      // Step 7: Poll for processing status
      const cancelPolling = documentsService.pollProcessingStatus(
        documentId,
        (status: DocumentProcessingStatus) => {
          // Update progress during processing
          const progressPercent = 70 + ((status.progress || 0) * 0.3) // 70-100%
          
          // Map API status to component status
          const componentStatus: UploadingFile['status'] = 
            status.processingStatus === 'processing' ? 'processing' :
            status.processingStatus === 'completed' ? 'completed' :
            status.processingStatus === 'failed' ? 'error' :
            'processing' // default fallback
          
          setUploadingFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { 
                  ...f, 
                  progress: Math.round(progressPercent),
                  status: componentStatus
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
      console.error('Upload failed for file:', uploadFile.file?.name, error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      const errorFile = {
        ...uploadFile,
        status: 'error' as const,
        error: errorMessage,
      }

      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? errorFile : f
      ))

      onUploadError?.(errorFile, errorMessage)
      abortControllers.current.delete(uploadFile.id)
    }
  }, [calculateFileHash, checkDuplicate, onUploadComplete, onUploadError])

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
  }, [user, validateFile, onUploadStart, onUploadError, uploadDocument])

  const handleRetryUpload = useCallback((documentId: string) => {
    const file = uploadingFiles.find(f => f.id === documentId)
    if (file && file.file) {
      setUploadingFiles(prev => prev.map(f => 
        f.id === documentId 
          ? { ...f, status: 'pending', progress: 0, error: undefined }
          : f
      ))
      uploadDocument({ ...file, status: 'pending', progress: 0, error: undefined })
    }
  }, [uploadingFiles, uploadDocument])

  const handleCancelUpload = useCallback((documentId: string) => {
    const controller = abortControllers.current.get(documentId)
    if (controller) {
      controller.abort()
      abortControllers.current.delete(documentId)
    }

    setUploadingFiles(prev => prev.filter(f => f.id !== documentId))
  }, [])

  const handleRemoveFile = useCallback((documentId: string) => {
    handleCancelUpload(documentId)
  }, [handleCancelUpload])

  const handleClearCompleted = useCallback(() => {
    setUploadingFiles(prev => prev.filter(f => f.status !== 'completed'))
  }, [])

  // Utility function for formatting file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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