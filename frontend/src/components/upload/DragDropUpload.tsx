'use client'

import React, { useCallback, useState } from 'react'
import { Button, Card, Badge } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { VisuallyHidden } from '@/components/a11y'

interface DragDropUploadProps {
  onFilesSelected: (files: FileList) => void
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  helperText?: string
  showFileCount?: boolean
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFilesSelected,
  accept = '.pdf,application/pdf',
  multiple = true,
  maxSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  disabled = false,
  className = '',
  children,
  helperText,
  showFileCount = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const validateFiles = useCallback((files: FileList): { valid: FileList; invalid: File[] } => {
    const validFiles: File[] = []
    const invalidFiles: File[] = []

    Array.from(files).forEach(file => {
      // Check file type
      if (accept.includes(file.type) || accept.includes(`.${file.name.split('.').pop()}`)) {
        // Check file size
        if (file.size <= maxSize) {
          validFiles.push(file)
        } else {
          invalidFiles.push(file)
        }
      } else {
        invalidFiles.push(file)
      }
    })

    // Limit number of files
    const limitedValidFiles = validFiles.slice(0, maxFiles)
    const exceededFiles = validFiles.slice(maxFiles)
    
    const validFileList = new DataTransfer()
    limitedValidFiles.forEach(file => validFileList.items.add(file))

    return {
      valid: validFileList.files,
      invalid: [...invalidFiles, ...exceededFiles]
    }
  }, [accept, maxSize, maxFiles])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return

    setDragCounter(prev => prev + 1)
    setIsDragOver(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return

    const newCounter = dragCounter - 1
    setDragCounter(newCounter)
    
    if (newCounter === 0) {
      setIsDragOver(false)
    }
  }, [disabled, dragCounter])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return

    // Show copy cursor
    e.dataTransfer.dropEffect = 'copy'
  }, [disabled])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return

    setIsDragOver(false)
    setDragCounter(0)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const { valid, invalid } = validateFiles(files)
      
      if (valid.length > 0) {
        onFilesSelected(valid)
      }
      
      // Handle invalid files (could show notifications)
      if (invalid.length > 0) {
        console.warn('Invalid files:', invalid.map(f => f.name))
      }
    }
  }, [disabled, validateFiles, onFilesSelected])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const { valid, invalid } = validateFiles(files)
      
      if (valid.length > 0) {
        onFilesSelected(valid)
      }
      
      // Reset input value to allow same file selection
      e.target.value = ''
    }
  }, [validateFiles, onFilesSelected])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={className}>
      <Card
        variant="outlined"
        className={`relative border-2 border-dashed transition-all duration-200 ${
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            : isDragOver
            ? 'border-blue-400 bg-blue-50 shadow-md'
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) {
            document.getElementById('file-input')?.click()
          }
        }}
        padding="lg"
      >
        <input
          id="file-input"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
          aria-label="File upload input"
        />

        {children || (
          <Stack spacing="md" align="center" className="py-8">
            <div className={`transition-transform duration-200 ${isDragOver ? 'scale-110' : 'scale-100'}`}>
              <svg 
                className={`w-16 h-16 transition-colors ${
                  isDragOver ? 'text-blue-500' : 'text-gray-400'
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                />
              </svg>
            </div>

            <div className="text-center">
              <h3 className={`text-lg font-semibold mb-2 ${
                disabled ? 'text-gray-500' : isDragOver ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {isDragOver ? 'Drop files here' : 'Upload PDF Documents'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {disabled 
                  ? 'Upload disabled' 
                  : helperText || 'Drag and drop your files here, or click to browse'
                }
              </p>

              {!disabled && (
                <Stack spacing="sm" align="center">
                  <Button variant="primary" size="md">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l4-4 4 4M7 10l4-4 4 4" />
                    </svg>
                    Choose Files
                  </Button>

                  <Flex gap="md" className="text-xs text-gray-500">
                    <span>PDF files only</span>
                    <span>•</span>
                    <span>Max {formatFileSize(maxSize)} per file</span>
                    {multiple && (
                      <>
                        <span>•</span>
                        <span>Up to {maxFiles} files</span>
                      </>
                    )}
                  </Flex>
                </Stack>
              )}
            </div>
          </Stack>
        )}

        {/* Visual feedback overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/5 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none" />
        )}
      </Card>

      <VisuallyHidden>
        <div aria-live="polite" aria-atomic="true">
          {isDragOver ? 'Drop zone active. Release to upload files.' : ''}
        </div>
      </VisuallyHidden>
    </div>
  )
}

export default DragDropUpload