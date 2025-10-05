import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className = '', 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    fullWidth = false,
    asChild = false,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm'

    const variants = {
      primary: 'bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-500 shadow-emerald-200',
      secondary: 'bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500 shadow-cyan-200',
      outline: 'border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-emerald-500 shadow-none',
      ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-emerald-500 shadow-none',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-red-200',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-5 py-2.5 text-base h-10',
      lg: 'px-7 py-3 text-lg h-12',
    }
    
    const widthClass = fullWidth ? 'w-full' : ''
    
    const buttonClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`
    
    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<{ className?: string }>
      return React.cloneElement(child, {
        className: `${buttonClasses} ${child.props.className || ''}`.trim(),
        ...props,
      })
    }
    
    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button