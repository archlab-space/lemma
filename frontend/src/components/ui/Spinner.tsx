import React from 'react'

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white'
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ 
    className = '',
    size = 'md',
    color = 'primary',
    ...props 
  }, ref) => {
    const sizeMap = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    }
    
    const colorMap = {
      primary: 'text-blue-600',
      secondary: 'text-gray-600',
      white: 'text-white',
    }
    
    const spinnerClasses = `animate-spin ${sizeMap[size]} ${colorMap[color]} ${className}`
    
    return (
      <div
        ref={ref}
        className={spinnerClasses}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <svg className="animate-spin h-full w-full" fill="none" viewBox="0 0 24 24">
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    )
  }
)

Spinner.displayName = 'Spinner'

export default Spinner