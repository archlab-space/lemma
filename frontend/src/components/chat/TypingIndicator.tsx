'use client'

import React from 'react'

interface TypingIndicatorProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  className = '',
  size = 'md',
  message = 'AI is typing...',
}) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  }

  const containerSizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  }

  return (
    <div className={`flex justify-start ${className}`}>
      <div className="max-w-xs">
        <div className={`bg-gray-100 rounded-lg ${containerSizeClasses[size]}`}>
          <div className="flex items-center space-x-1">
            {/* Typing dots */}
            <div className="flex space-x-1">
              <div 
                className={`${sizeClasses[size]} bg-gray-500 rounded-full animate-bounce`}
                style={{ animationDelay: '0ms' }}
              />
              <div 
                className={`${sizeClasses[size]} bg-gray-500 rounded-full animate-bounce`}
                style={{ animationDelay: '150ms' }}
              />
              <div 
                className={`${sizeClasses[size]} bg-gray-500 rounded-full animate-bounce`}
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        </div>
        
        {/* Optional message */}
        {message && (
          <p className="text-xs text-gray-500 mt-1 px-1">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

export default TypingIndicator