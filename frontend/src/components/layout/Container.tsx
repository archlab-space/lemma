import React from 'react'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  center?: boolean
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ 
    className = '',
    size = 'lg',
    center = true,
    children,
    ...props 
  }, ref) => {
    const baseStyles = 'w-full px-4 sm:px-6 lg:px-8'
    
    const sizes = {
      sm: 'max-w-2xl',
      md: 'max-w-4xl', 
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-none',
    }
    
    const centerStyle = center ? 'mx-auto' : ''
    
    const containerClasses = `${baseStyles} ${sizes[size]} ${centerStyle} ${className}`
    
    return (
      <div
        ref={ref}
        className={containerClasses}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Container.displayName = 'Container'

export default Container