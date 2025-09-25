'use client'

import React from 'react'
import { Flex } from '@/components/layout'

interface UploadProgressBarProps {
  progress: number
  status?: 'uploading' | 'processing' | 'completed' | 'error'
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
  animated?: boolean
  className?: string
}

const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  progress,
  status = 'uploading',
  size = 'md',
  showPercentage = true,
  animated = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const getProgressColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'processing':
        return 'bg-yellow-500'
      case 'uploading':
      default:
        return 'bg-blue-500'
    }
  }

  const getProgressAnimation = () => {
    if (!animated) return ''
    
    switch (status) {
      case 'processing':
        return 'animate-pulse'
      case 'uploading':
        return progress < 100 ? 'transition-all duration-300 ease-out' : ''
      default:
        return ''
    }
  }

  const clampedProgress = Math.min(Math.max(progress, 0), 100)

  return (
    <div className={className}>
      <Flex justify="between" align="center" className="mb-1">
        <span className="text-xs font-medium text-gray-700 capitalize">
          {status === 'uploading' && progress < 100 ? 'Uploading...' : status}
        </span>
        {showPercentage && (
          <span className="text-xs text-gray-500">
            {Math.round(clampedProgress)}%
          </span>
        )}
      </Flex>
      
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all duration-300 ease-out ${getProgressColor()} ${getProgressAnimation()}`}
          style={{ 
            width: `${clampedProgress}%`,
            transformOrigin: 'left center'
          }}
        />
        
        {/* Animated stripe effect for uploading */}
        {status === 'uploading' && animated && progress < 100 && (
          <div
            className={`${sizeClasses[size]} absolute top-0 left-0 rounded-full overflow-hidden`}
            style={{ width: `${clampedProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadProgressBar