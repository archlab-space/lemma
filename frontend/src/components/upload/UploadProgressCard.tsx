'use client'

import React from 'react'
import { Card, CardContent, Button, Badge, Spinner } from '@/components/ui'
import { Flex, Stack } from '@/components/layout'
import UploadProgressBar from './UploadProgressBar'

interface UploadFile {
  id: string
  name: string
  size: number
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  estimatedTime?: number
  uploadSpeed?: number
}

interface UploadProgressCardProps {
  file: UploadFile
  onRetry?: (fileId: string) => void
  onCancel?: (fileId: string) => void
  onRemove?: (fileId: string) => void
  showDetails?: boolean
}

const UploadProgressCard: React.FC<UploadProgressCardProps> = ({
  file,
  onRetry,
  onCancel,
  onRemove,
  showDetails = true,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatSpeed = (bytesPerSecond: number) => {
    return `${formatFileSize(bytesPerSecond)}/s`
  }

  const getStatusIcon = () => {
    switch (file.status) {
      case 'pending':
        return (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
        )
      case 'uploading':
        return <Spinner size="sm" color="primary" />
      case 'processing':
        return <Spinner size="sm" color="secondary" />
      case 'completed':
        return (
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  const getStatusBadgeVariant = () => {
    switch (file.status) {
      case 'completed':
        return 'success'
      case 'error':
        return 'error'
      case 'processing':
        return 'warning'
      case 'uploading':
        return 'info'
      default:
        return 'default'
    }
  }

  const getStatusText = () => {
    switch (file.status) {
      case 'pending':
        return 'Waiting...'
      case 'uploading':
        return 'Uploading'
      case 'processing':
        return 'Processing'
      case 'completed':
        return 'Complete'
      case 'error':
        return 'Failed'
      default:
        return file.status
    }
  }

  return (
    <Card variant="outlined" className="transition-all duration-200 hover:shadow-sm">
      <CardContent className="p-4">
        <Stack spacing="md">
          {/* Header with file info and status */}
          <Flex justify="between" align="start">
            <Flex gap="md" align="center" className="flex-1 min-w-0">
              {getStatusIcon()}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </h4>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </Flex>
            
            <Flex gap="sm" align="center">
              <Badge variant={getStatusBadgeVariant()} size="sm">
                {getStatusText()}
              </Badge>
              
              {/* Action buttons */}
              <Flex gap="sm">
                {file.status === 'error' && onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRetry(file.id)}
                    className="text-xs px-2 py-1"
                  >
                    Retry
                  </Button>
                )}
                
                {(file.status === 'uploading' || file.status === 'processing') && onCancel && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel(file.id)}
                    className="text-xs px-2 py-1 text-gray-500 hover:text-red-600"
                  >
                    Cancel
                  </Button>
                )}
                
                {(file.status === 'completed' || file.status === 'error') && onRemove && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(file.id)}
                    className="text-xs px-2 py-1 text-gray-500 hover:text-red-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                )}
              </Flex>
            </Flex>
          </Flex>

          {/* Progress bar for uploading/processing files */}
          {(file.status === 'uploading' || file.status === 'processing') && (
            <UploadProgressBar
              progress={file.progress}
              status={file.status}
              size="md"
              showPercentage={true}
              animated={true}
            />
          )}

          {/* Error message */}
          {file.status === 'error' && file.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-600">{file.error}</p>
            </div>
          )}

          {/* Additional details */}
          {showDetails && file.status === 'uploading' && (
            <Flex justify="between" className="text-xs text-gray-500">
              {file.uploadSpeed && (
                <span>Speed: {formatSpeed(file.uploadSpeed)}</span>
              )}
              {file.estimatedTime && file.estimatedTime > 0 && (
                <span>~{formatTime(file.estimatedTime)} remaining</span>
              )}
            </Flex>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default UploadProgressCard