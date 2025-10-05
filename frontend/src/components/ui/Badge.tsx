import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    className = '',
    variant = 'default',
    size = 'md',
    children,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center font-medium rounded-full border'

    const variants = {
      default: 'bg-gray-50 text-gray-700 border-gray-200',
      success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      warning: 'bg-amber-50 text-amber-800 border-amber-200',
      error: 'bg-red-50 text-red-800 border-red-200',
      info: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    }

    const sizes = {
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-3 py-1 text-sm',
    }
    
    const badgeClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`
    
    return (
      <span
        ref={ref}
        className={badgeClasses}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge