'use client'

import React from 'react'
import { Alert, Button } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'

interface UploadError {
  type: 'network' | 'auth' | 'server' | 'quota' | 'validation' | 'timeout' | 'unknown'
  message: string
  details?: string
  retryable: boolean
  file?: string
}

interface UploadErrorHandlerProps {
  error: UploadError
  onRetry?: () => void
  onDismiss?: () => void
  onContactSupport?: () => void
  className?: string
}

const UploadErrorHandler: React.FC<UploadErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  onContactSupport,
  className = '',
}) => {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        )
      case 'auth':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case 'quota':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      case 'server':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        )
      case 'timeout':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
    }
  }

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'Network Connection Error'
      case 'auth':
        return 'Authentication Required'
      case 'server':
        return 'Server Error'
      case 'quota':
        return 'Storage Quota Exceeded'
      case 'validation':
        return 'File Validation Failed'
      case 'timeout':
        return 'Upload Timeout'
      default:
        return 'Upload Failed'
    }
  }

  const getSuggestions = () => {
    switch (error.type) {
      case 'network':
        return [
          'Check your internet connection',
          'Try uploading again in a few moments',
          'Consider using a more stable network connection'
        ]
      case 'auth':
        return [
          'Please sign in to continue uploading',
          'Your session may have expired',
          'Try refreshing the page and signing in again'
        ]
      case 'server':
        return [
          'Our servers are experiencing issues',
          'Please try again in a few minutes',
          'If the problem persists, contact support'
        ]
      case 'quota':
        return [
          'You have reached your upload limit',
          'Delete some existing documents to free up space',
          'Upgrade your plan for more storage'
        ]
      case 'validation':
        return [
          'Check that your file is a valid PDF',
          'Ensure file size is under the limit',
          'Try uploading a different file'
        ]
      case 'timeout':
        return [
          'The upload took too long to complete',
          'Check your internet connection speed',
          'Try uploading smaller files'
        ]
      default:
        return [
          'An unexpected error occurred',
          'Please try uploading again',
          'Contact support if the problem continues'
        ]
    }
  }

  const getActionButtons = () => {
    const buttons = []

    if (error.retryable && onRetry) {
      buttons.push(
        <Button
          key="retry"
          variant="primary"
          size="sm"
          onClick={onRetry}
        >
          Try Again
        </Button>
      )
    }

    if (error.type === 'auth') {
      buttons.push(
        <Button
          key="signin"
          variant="primary"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Sign In
        </Button>
      )
    }

    if (error.type === 'quota') {
      buttons.push(
        <Button
          key="manage"
          variant="outline"
          size="sm"
          onClick={() => {
            // Navigate to document management or upgrade page
            window.location.href = '/dashboard'
          }}
        >
          Manage Storage
        </Button>
      )
    }

    if (['server', 'unknown'].includes(error.type) && onContactSupport) {
      buttons.push(
        <Button
          key="support"
          variant="outline"
          size="sm"
          onClick={onContactSupport}
        >
          Contact Support
        </Button>
      )
    }

    if (onDismiss) {
      buttons.push(
        <Button
          key="dismiss"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      )
    }

    return buttons
  }

  return (
    <Alert
      variant="error"
      icon={getErrorIcon()}
      title={getErrorTitle()}
      className={className}
    >
      <Stack spacing="md">
        <div>
          <p className="text-sm font-medium text-red-800 mb-1">
            {error.message}
          </p>
          {error.file && (
            <p className="text-xs text-red-600">
              File: {error.file}
            </p>
          )}
          {error.details && (
            <p className="text-xs text-red-600 mt-1">
              Details: {error.details}
            </p>
          )}
        </div>

        <div className="bg-red-50 p-3 rounded-md border border-red-200">
          <p className="text-xs font-medium text-red-800 mb-2">Suggestions:</p>
          <ul className="text-xs text-red-700 space-y-1">
            {getSuggestions().map((suggestion, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-red-500 font-bold mt-0.5">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>

        <Flex justify="end" gap="sm">
          {getActionButtons()}
        </Flex>
      </Stack>
    </Alert>
  )
}

export default UploadErrorHandler