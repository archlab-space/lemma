import React from 'react'
import Spinner from './Spinner'

export interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'md',
  message = 'Loading...',
  className = '',
}) => {
  const containerSizes = {
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12',
  }
  
  return (
    <div className={`flex flex-col items-center justify-center ${containerSizes[size]} ${className}`}>
      <Spinner size={size} />
      {message && (
        <p className="mt-3 text-sm text-gray-600" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  )
}

export default LoadingState