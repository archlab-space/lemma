import React from 'react'
import { ErrorFallbackProps } from './ErrorBoundary'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { Container, Stack } from '../layout'

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError 
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return (
    <Container size="md" className="py-8">
      <Stack spacing="lg" align="center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">
            We encountered an unexpected error. Please try again.
          </p>
        </div>
        
        <Alert 
          variant="error" 
          title="Error Details"
          className="w-full max-w-2xl"
        >
          <p className="font-mono text-sm">
            {error?.message || 'An unexpected error occurred'}
          </p>
          
          {isDevelopment && error?.stack && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">
                Stack Trace (Development Only)
              </summary>
              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded border overflow-auto max-h-40">
                {error.stack}
              </pre>
            </details>
          )}
        </Alert>
        
        <div className="flex space-x-4">
          <Button onClick={resetError} variant="primary">
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Reload Page
          </Button>
        </div>
      </Stack>
    </Container>
  )
}

export default ErrorFallback