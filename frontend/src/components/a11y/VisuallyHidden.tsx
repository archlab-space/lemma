import React from 'react'

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: React.ElementType
}

const VisuallyHidden = React.forwardRef<HTMLElement, VisuallyHiddenProps>(
  ({ as: Component = 'span', className = '', children, ...props }, ref) => {
    const visuallyHiddenClasses = 'sr-only'
    
    return (
      <Component
        ref={ref}
        className={`${visuallyHiddenClasses} ${className}`}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

VisuallyHidden.displayName = 'VisuallyHidden'

export default VisuallyHidden