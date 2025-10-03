'use client'

import React, { useState } from 'react'
import { Button, Alert } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { FocusTrap } from '@/components/a11y'
import type { Document } from '@/lib/api/types'

interface DeleteDocumentDialogProps {
  document: Document
  isOpen: boolean
  onClose: () => void
  onConfirm: (documentId: string) => Promise<void>
  onSuccess?: () => void
  className?: string
}

const DeleteDocumentDialog: React.FC<DeleteDocumentDialogProps> = ({
  document,
  isOpen,
  onClose,
  onConfirm,
  onSuccess,
  className = '',
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    try {
      setIsDeleting(true)
      setError(null)
      await onConfirm(document.id)
      onClose()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (isDeleting) return
    setError(null)
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <FocusTrap active={isOpen} restoreFocus={true}>
          <div 
            className={`relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg ${className}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <Stack spacing="md">
                {/* Icon and Title */}
                <Flex gap="md" align="start">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg 
                      className="h-6 w-6 text-red-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" 
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-lg font-medium leading-6 text-gray-900" 
                      id="delete-dialog-title"
                    >
                      Delete Document
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Are you sure you want to delete this document? This action cannot be undone.
                    </p>
                  </div>
                </Flex>

                {/* Document Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <Stack spacing="sm">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {document.title || document.filename}
                      </h4>
                      <div className="mt-1 text-xs text-gray-500 space-y-1">
                        <p>Filename: {document.filename}</p>
                        <p>Size: {formatFileSize(document.fileSizeBytes)}</p>
                        <p>Uploaded: {formatDate(document.createdAt)}</p>
                        {document.totalPages && (
                          <p>Pages: {document.totalPages}</p>
                        )}
                      </div>
                    </div>
                  </Stack>
                </div>

                {/* Warning */}
                <Alert variant="error" title="This will permanently delete:">
                  <ul className="text-sm space-y-1 mt-2">
                    <li>• The document file and all processed data</li>
                    <li>• All chat sessions and message history</li>
                    <li>• Document summaries and extracted metadata</li>
                    <li>• Any bookmarks or notes for this document</li>
                  </ul>
                </Alert>

                {/* Error message */}
                {error && (
                  <Alert variant="error" title="Deletion Failed">
                    <p className="text-sm">{error}</p>
                  </Alert>
                )}
              </Stack>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <Flex gap="sm" className="w-full sm:w-auto">
                <Button
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={isDeleting}
                  loading={isDeleting}
                  fullWidth={true}
                  className="sm:w-auto"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Document'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isDeleting}
                  fullWidth={true}
                  className="sm:w-auto"
                >
                  Cancel
                </Button>
              </Flex>
            </div>
          </div>
        </FocusTrap>
      </div>
    </div>
  )
}

export default DeleteDocumentDialog