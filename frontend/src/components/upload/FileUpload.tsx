'use client'

/**
 * Secure File Upload Component
 * Handles PDF file upload with validation, progress tracking, and R2 integration
 */

import React, { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Badge, Card, CardContent, LoadingState, Spinner } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { ErrorMessage } from '@/components/error'

interface DocumentMetadata {
  id: string
  userId: string
  filename: string
  originalFilename: string
  fileSizeBytes: number
  fileHash: string
  mimeType: string
  storage_path?: string
  storageBucket: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'deleted'
  createdAt: string
  updatedAt: string
  fileId?: string
  // Optional metadata that gets populated during processing
  title?: string
  authors?: string[]
  abstract?: string
  doi?: string
  publicationYear?: number
  journal?: string
  keywords?: string[]
  totalPages?: number
  totalWords?: number
  totalChunks?: number
}

interface UploadFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
  metadata?: {
    pages?: number
    size: number
    type: string
    path?: string
  }
}

interface FileUploadProps {
  onUploadComplete?: (file: UploadFile) => void
  onUploadError?: (file: UploadFile, error: string) => void
  maxFileSize?: number // in bytes, default 50MB
  allowMultiple?: boolean
  className?: string
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  allowMultiple = false,
  className = "",
}: FileUploadProps) {
  const { user, session } = useAuth()
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File validation
  const validateFile = (file: File): string | null => {
    // Check file type
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed'
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = Math.round(maxFileSize / (1024 * 1024))
      return `File size must be less than ${maxSizeMB}MB`
    }

    // Check if file already exists
    const existingFile = uploadFiles.find(f => f.file.name === file.name && f.file.size === file.size)
    if (existingFile) {
      return 'This file is already being uploaded'
    }

    return null
  }

  // Calculate file hash for duplicate detection
  const calculateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Check if file is duplicate
  const checkDuplicate = async (fileHash: string) => {
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    try {
      const response = await fetch('http://localhost:8787/api/v1/documents/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ fileHash }),
      })

      if (!response.ok) {
        throw new Error('Failed to check for duplicates')
      }

      return await response.json()
    } catch (error) {
      console.error('Error checking duplicate:', error)
      throw error
    }
  }

  // Create document metadata first
  const createDocumentMetadata = async (
    filename: string, 
    originalFilename: string, 
    fileSizeBytes: number, 
    fileHash: string, 
    mimeType: string,
    storagePath: string,
    fileId: string
  ) => {
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    try {
      const response = await fetch('http://localhost:8787/api/v1/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          filename,
          originalFilename,
          fileSizeBytes,
          fileHash,
          mimeType,
          storagePath,
          fileId,
        }),
      })

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('This document has already been uploaded')
        }
        throw new Error('Failed to create document metadata')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating document metadata:', error)
      throw error
    }
  }

  // Generate pre-signed URL for R2 upload
  const generatePresignedUrl = async (fileName: string, fileSize: number, fileType: string, storagePath?: string, fileId?: string, sanitizedFileName?: string) => {
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    try {
      const response = await fetch('http://localhost:8787/api/v1/upload/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          fileName,
          fileSize,
          fileType,
          userId: user?.id,
          ...(storagePath && { storagePath }),
          ...(fileId && { fileId }),
          ...(sanitizedFileName && { sanitizedFileName }),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate upload URL')
      }

      const data = await response.json()
      return {
        uploadUrl: data.uploadUrl, // Use presigned URL directly (it's already absolute)
        fileId: data.fileId,
        filePath: data.filePath,
        sanitizedFileName: data.sanitizedFileName,
      }
    } catch (error) {
      console.error('Error generating presigned URL:', error)
      throw error
    }
  }

  // Upload file to R2 using presigned URL
  const uploadToR2 = async (file: File, uploadUrl: string, onProgress: (progress: number) => void) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          console.error('Upload failed:', {
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.responseText
          })
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', (event) => {
        console.error('XHR error event:', event)
        reject(new Error('Upload failed'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'))
      })

      console.log('Opening XHR with URL:', uploadUrl)
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      // DO NOT add Authorization header for direct R2 uploads - presigned URL contains auth
      console.log('Sending file:', file.name, file.size, 'bytes')
      xhr.send(file)
    })
  }


  // Process a single file upload with duplicate prevention
  const processFileUpload = async (uploadFile: UploadFile) => {
    const { file } = uploadFile

    try {
      // Update status to uploading
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ))

      // Step 1: Calculate file hash for duplicate detection
      console.log('Calculating file hash for:', file.name)
      const fileHash = await calculateFileHash(file)
      console.log('File hash calculated:', fileHash)

      // Update progress after hash calculation
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, progress: 20 }
          : f
      ))

      // Step 2: Check for duplicates
      console.log('Checking for duplicates...')
      const duplicateCheck = await checkDuplicate(fileHash)
      
      if (duplicateCheck.isDuplicate && duplicateCheck.existingDocument.processingStatus !== 'pending') {
        throw new Error(`This document has already been uploaded: "${duplicateCheck.existingDocument.originalFilename}"`)
      }

      // If duplicate but failed/pending, we'll overwrite it
      const isRetry = duplicateCheck.isDuplicate && 'pending' == duplicateCheck.existingDocument.processingStatus

      // Step 3: Generate presigned URL first to get storage details
      let uploadUrl: string
      let filePath: string
      let sanitizedFileName: string
      let documentResponse: { document: DocumentMetadata }
      
      if (isRetry) {
        console.log('Retrying previous upload for existing document...')
        documentResponse = { document: duplicateCheck.existingDocument }
        filePath = duplicateCheck.existingDocument.storage_path
                
        const extractedFileId: string = duplicateCheck.existingDocument.id
        const extractedSanitizedFileName: string = duplicateCheck.existingDocument.filename
                
        // Generate presigned URL using existing storage details for retry
        const urlResponse = await generatePresignedUrl(
          file.name,
          file.size,
          file.type,
          filePath,
          extractedFileId,
          extractedSanitizedFileName
        )
        uploadUrl = urlResponse.uploadUrl
        sanitizedFileName = extractedSanitizedFileName
      } else {
        console.log('Generating presigned URL for:', file.name)
        const urlResponse = await generatePresignedUrl(
          file.name,
          file.size,
          file.type,
        )
        uploadUrl = urlResponse.uploadUrl
        filePath = urlResponse.filePath
        sanitizedFileName = urlResponse.sanitizedFileName
        console.log('Received presigned URL and storage path:', filePath)

        // Update progress after URL generation
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 30 }
            : f
        ))

        // Step 4: Create document metadata using storage details from URL generation
        console.log('Creating document metadata...')
        documentResponse = await createDocumentMetadata(
          sanitizedFileName,  // Use sanitized filename from storage path
          file.name,          // Keep original filename
          file.size,
          fileHash,
          file.type,
          filePath,           // Use the actual storage path
          urlResponse.fileId              // Pass the fileId for consistency
        )
        console.log('Document metadata created:', documentResponse.document)
      }

      // Update progress after metadata creation
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, progress: 40 }
          : f
      ))

      // Step 5: Upload to R2
      console.log('Uploading file to R2...')
      await uploadToR2(file, uploadUrl, (progress) => {
        // Map upload progress to 40-100% range
        const adjustedProgress = 40 + (progress * 0.6)
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: adjustedProgress }
            : f
        ))
      })

      // Step 6: Notify backend that upload is complete and ready for processing
      console.log('Notifying backend of successful upload...')
      try {
        await fetch(`http://localhost:8787/api/v1/documents/${documentResponse.document.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            processingStatus: 'processing'
          }),
        })
        console.log('Backend notified of upload completion')
      } catch (error) {
        console.warn('Failed to notify backend of upload completion:', error)
        // Don't fail the upload for this - it's not critical
      }

      // Step 7: Update UI status to processing (backend will handle PDF processing)
      const completedFile = {
        ...uploadFile,
        status: 'processing' as const,
        progress: 100,
        metadata: {
          size: file.size,
          type: file.type,
          path: filePath,
          documentId: documentResponse.document.id,
        },
      }

      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? completedFile : f
      ))

      onUploadComplete?.(completedFile)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      const errorFile = {
        ...uploadFile,
        status: 'error' as const,
        error: errorMessage,
      }

      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? errorFile : f
      ))

      onUploadError?.(errorFile, errorMessage)
    }
  }

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList) => {
    if (!session?.access_token || !user) {
      console.error('Cannot upload files: User not authenticated')
      return
    }

    const filesToUpload: UploadFile[] = []

    Array.from(files).forEach(file => {
      const validationError = validateFile(file)
      
      if (validationError) {
        const errorFile: UploadFile = {
          id: crypto.randomUUID(),
          file,
          status: 'error',
          progress: 0,
          error: validationError,
          metadata: {
            size: file.size,
            type: file.type,
          },
        }
        filesToUpload.push(errorFile)
        onUploadError?.(errorFile, validationError)
      } else {
        filesToUpload.push({
          id: crypto.randomUUID(),
          file,
          status: 'pending',
          progress: 0,
          metadata: {
            size: file.size,
            type: file.type,
          },
        })
      }
    })

    // Add files to upload queue
    setUploadFiles(prev => allowMultiple ? [...prev, ...filesToUpload] : filesToUpload)

    // Start uploading valid files
    filesToUpload
      .filter(f => f.status === 'pending')
      .forEach(processFileUpload)
  }, [allowMultiple, maxFileSize, uploadFiles, user, session, calculateFileHash, checkDuplicate, createDocumentMetadata, generatePresignedUrl])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  // File input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files)
    }
  }, [handleFileSelect])

  // Remove file from upload queue
  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId))
  }

  // Retry failed upload
  const retryUpload = (fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId)
    if (file) {
      const retryFile = { ...file, status: 'pending' as const, error: undefined }
      setUploadFiles(prev => prev.map(f => f.id === fileId ? retryFile : f))
      processFileUpload(retryFile)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'uploading':
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-5 h-5 text-yellow-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      default:
        return null
    }
  }

  const isDisabled = !session?.access_token || !user

  return (
    <Stack spacing="lg" className={className}>
      {/* Upload Area */}
      <Card
        variant="outlined"
        className={`relative border-2 border-dashed text-center transition-colors cursor-pointer ${
          isDisabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={!isDisabled ? handleDragOver : undefined}
        onDragLeave={!isDisabled ? handleDragLeave : undefined}
        onDrop={!isDisabled ? handleDrop : undefined}
        onClick={() => !isDisabled && fileInputRef.current?.click()}
        padding="lg"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple={allowMultiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <Stack spacing="md" align="center">
          <div className="flex justify-center">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div className="text-center">
            <h3 className={`text-lg font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
              Upload PDF Documents
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isDisabled 
                ? 'Please sign in to upload documents'
                : 'Drag and drop your PDF files here, or click to browse'
              }
            </p>
          </div>

          <Stack spacing="sm" align="center">
            <Button
              variant={isDisabled ? 'secondary' : 'primary'}
              disabled={isDisabled}
            >
              Choose Files
            </Button>
            <p className="text-xs text-gray-500">
              PDF files only • Max {Math.round(maxFileSize / (1024 * 1024))}MB per file
            </p>
          </Stack>
        </Stack>
      </Card>

      {/* Upload Queue */}
      {uploadFiles.length > 0 && (
        <Card variant="outlined">
          <div className="px-4 py-3 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-900">Upload Queue</h4>
          </div>
          
          <Stack spacing="none" className="divide-y divide-gray-200">
            {uploadFiles.map((uploadFile) => (
              <CardContent key={uploadFile.id} className="px-4 py-4">
                <Flex justify="between" align="center">
                  <Flex gap="md" align="center" className="flex-1 min-w-0">
                    <Badge 
                      variant={
                        uploadFile.status === 'completed' ? 'success' :
                        uploadFile.status === 'processing' ? 'info' :
                        uploadFile.status === 'uploading' ? 'info' :
                        uploadFile.status === 'error' ? 'error' : 'default'
                      }
                    >
                      {uploadFile.status}
                    </Badge>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadFile.file.size)}
                      </p>
                      
                      {uploadFile.error && (
                        <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                      )}
                    </div>
                  </Flex>

                  <Flex gap="sm" align="center">
                    {uploadFile.status === 'uploading' && (
                      <Flex gap="sm" align="center">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10">
                          {Math.round(uploadFile.progress)}%
                        </span>
                      </Flex>
                    )}

                    {uploadFile.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryUpload(uploadFile.id)}
                      >
                        Retry
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(uploadFile.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </Flex>
                </Flex>
              </CardContent>
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}