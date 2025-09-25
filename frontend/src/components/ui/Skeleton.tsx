import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className = '',
    variant = 'text',
    width,
    height,
    lines = 1,
    ...props 
  }, ref) => {
    const baseStyles = 'animate-pulse bg-gray-200 rounded'
    
    const variants = {
      text: 'h-4',
      circular: 'rounded-full',
      rectangular: 'rounded-md',
    }
    
    const skeletonStyles = `${baseStyles} ${variants[variant]}`
    
    const style = {
      width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
      height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
    }
    
    if (variant === 'text' && lines > 1) {
      return (
        <div className={`space-y-2 ${className}`}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={`${skeletonStyles} ${index === lines - 1 ? 'w-3/4' : 'w-full'}`}
              style={style}
            />
          ))}
        </div>
      )
    }
    
    return (
      <div
        ref={ref}
        className={`${skeletonStyles} ${className}`}
        style={style}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

export default Skeleton