'use client'

import React from 'react'
import { Alert, Button, Badge } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'

interface ValidationError {
  file: File
  errors: string[]
}

interface FileValidationAlertProps {
  validationErrors: ValidationError[]
  onDismiss?: () => void
  onRetryFile?: (file: File) => void
  onRemoveFile?: (file: File) => void
  className?: string
}

const FileValidationAlert: React.FC<FileValidationAlertProps> = ({
  validationErrors,
  onDismiss,
  onRetryFile,
  onRemoveFile,
  className = '',
}) => {
  if (validationErrors.length === 0) {
    return null
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const totalFiles = validationErrors.length
  const totalErrors = validationErrors.reduce((sum, item) => sum + item.errors.length, 0)

  return (
    <Alert
      variant="error"
      title={`File Validation Failed (${totalFiles} file${totalFiles > 1 ? 's' : ''}, ${totalErrors} error${totalErrors > 1 ? 's' : ''})`}
      className={className}
    >
      <Stack spacing="md">
        <p className="text-sm">
          The following files could not be uploaded due to validation errors:
        </p>

        <Stack spacing="sm" className="max-h-60 overflow-y-auto">
          {validationErrors.map((item, index) => (
            <div
              key={index}
              className="bg-red-25 border border-red-200 rounded-md p-3"
            >
              <Flex justify="between" align="start">
                <div className="flex-1 min-w-0">
                  <Flex gap="sm" align="center" className="mb-2">
                    <h4 className="text-sm font-medium text-red-900 truncate">
                      {item.file.name}
                    </h4>
                    <Badge variant="error" size="sm">
                      {formatFileSize(item.file.size)}
                    </Badge>
                  </Flex>
                  
                  <ul className="text-xs text-red-700 space-y-1">
                    {item.errors.map((error, errorIndex) => (
                      <li key={errorIndex} className="flex items-start gap-1">
                        <span className="text-red-500 font-bold">•</span>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>

                <Flex gap="xs" className="ml-3">
                  {onRetryFile && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRetryFile(item.file)}
                      className="text-xs px-2 py-1 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Retry
                    </Button>
                  )}
                  {onRemoveFile && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveFile(item.file)}
                      className="text-xs px-2 py-1 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </Button>
                  )}
                </Flex>
              </Flex>
            </div>
          ))}
        </Stack>

        {/* Help text */}
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <p className="font-medium mb-1">Upload Requirements:</p>
          <ul className="space-y-1">
            <li>• Only PDF files are accepted</li>
            <li>• Maximum file size: 50MB</li>
            <li>• File names must not contain special characters</li>
            <li>• Files must not be corrupted or password-protected</li>
          </ul>
        </div>

        {/* Action buttons */}
        <Flex justify="end" gap="sm">
          {onDismiss && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </Flex>
      </Stack>
    </Alert>
  )
}

export default FileValidationAlert