import React from 'react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'

export interface ErrorMessageProps {
  title?: string
  message?: string
  error?: Error | string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Error',
  message,
  error,
  onRetry,
  onDismiss,
  className,
}) => {
  const errorMessage = message || 
    (typeof error === 'string' ? error : error?.message) || 
    'An unexpected error occurred'
  
  return (
    <Alert variant="error" title={title} className={className}>
      <p className="mb-4">{errorMessage}</p>
      
      {(onRetry || onDismiss) && (
        <div className="flex space-x-3">
          {onRetry && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onRetry}
            >
              Try Again
            </Button>
          )}
          {onDismiss && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </div>
      )}
    </Alert>
  )
}

export default ErrorMessage