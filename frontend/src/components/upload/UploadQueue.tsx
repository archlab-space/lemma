'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import UploadProgressCard from './UploadProgressCard'
import { ErrorMessage } from '@/components/error'

interface UploadFile {
  id: string
  name: string
  size: number
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  estimatedTime?: number
  uploadSpeed?: number
  file?: File
}

interface UploadQueueProps {
  files: UploadFile[]
  onRetry?: (fileId: string) => void
  onCancel?: (fileId: string) => void
  onRemove?: (fileId: string) => void
  onClearCompleted?: () => void
  onClearAll?: () => void
  onPauseAll?: () => void
  onResumeAll?: () => void
  maxVisible?: number
  className?: string
  showBatchActions?: boolean
}

const UploadQueue: React.FC<UploadQueueProps> = ({
  files,
  onRetry,
  onCancel,
  onRemove,
  onClearCompleted,
  onClearAll,
  onPauseAll,
  onResumeAll,
  maxVisible = 5,
  className = '',
  showBatchActions = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // Calculate queue statistics
  const stats = {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    uploading: files.filter(f => f.status === 'uploading').length,
    processing: files.filter(f => f.status === 'processing').length,
    completed: files.filter(f => f.status === 'completed').length,
    error: files.filter(f => f.status === 'error').length,
  }

  const hasActiveUploads = stats.uploading > 0 || stats.processing > 0
  const hasErrors = stats.error > 0
  const hasCompleted = stats.completed > 0

  // Calculate overall progress
  const overallProgress = files.length > 0 
    ? files.reduce((sum, file) => sum + file.progress, 0) / files.length
    : 0

  // Determine which files to show
  const visibleFiles = showAll ? files : files.slice(0, maxVisible)
  const hasMoreFiles = files.length > maxVisible && !showAll

  if (files.length === 0) {
    return null
  }

  return (
    <Card variant="outlined" className={className}>
      <CardHeader className="pb-3">
        <Flex justify="between" align="center">
          <Flex gap="md" align="center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
            
            <CardTitle className="text-base">
              Upload Queue ({stats.total})
            </CardTitle>
            
            <Flex gap="xs">
              {hasActiveUploads && (
                <Badge variant="info" size="sm">
                  {stats.uploading + stats.processing} active
                </Badge>
              )}
              {hasErrors && (
                <Badge variant="error" size="sm">
                  {stats.error} failed
                </Badge>
              )}
              {hasCompleted && (
                <Badge variant="success" size="sm">
                  {stats.completed} done
                </Badge>
              )}
            </Flex>
          </Flex>

          {/* Queue actions */}
          <Flex gap="xs">
            {hasActiveUploads && onPauseAll && (
              <Button size="sm" variant="outline" onClick={onPauseAll}>
                Pause All
              </Button>
            )}
            
            {stats.pending > 0 && onResumeAll && (
              <Button size="sm" variant="outline" onClick={onResumeAll}>
                Resume All
              </Button>
            )}
            
            {hasCompleted && onClearCompleted && (
              <Button size="sm" variant="outline" onClick={onClearCompleted}>
                Clear Completed
              </Button>
            )}
            
            {onClearAll && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={onClearAll}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            )}
          </Flex>
        </Flex>

        {/* Overall progress bar */}
        {hasActiveUploads && !isCollapsed && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">Overall Progress</span>
              <span className="text-sm text-gray-500">{Math.round(overallProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          <Stack spacing="md">
            {/* Error summary */}
            {hasErrors && (
              <ErrorMessage
                title="Upload Errors"
                message={`${stats.error} file${stats.error === 1 ? '' : 's'} failed to upload. Check individual files below.`}
                onRetry={() => {
                  files
                    .filter(f => f.status === 'error')
                    .forEach(f => onRetry?.(f.id))
                }}
              />
            )}

            {/* File list */}
            <Stack spacing="sm">
              {visibleFiles.map((file) => (
                <UploadProgressCard
                  key={file.id}
                  file={file}
                  onRetry={onRetry}
                  onCancel={onCancel}
                  onRemove={onRemove}
                  showDetails={true}
                />
              ))}
            </Stack>

            {/* Show more/less toggle */}
            {files.length > maxVisible && (
              <Flex justify="center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll 
                    ? 'Show Less' 
                    : `Show ${files.length - maxVisible} More Files`
                  }
                </Button>
              </Flex>
            )}

            {/* Queue status summary */}
            {!hasActiveUploads && files.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-600">
                {stats.completed === stats.total 
                  ? '🎉 All uploads completed successfully!'
                  : stats.error === stats.total
                  ? '❌ All uploads failed'
                  : stats.pending === stats.total
                  ? '⏳ All uploads queued'
                  : `${stats.completed} completed • ${stats.error} failed • ${stats.pending} pending`
                }
              </div>
            )}
          </Stack>
        </CardContent>
      )}
    </Card>
  )
}

export default UploadQueue