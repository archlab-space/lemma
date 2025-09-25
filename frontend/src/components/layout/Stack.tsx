import React from 'react'

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal'
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ 
    className = '',
    direction = 'vertical',
    spacing = 'md',
    align = 'stretch',
    justify = 'start',
    children,
    ...props 
  }, ref) => {
    const baseStyles = 'flex'
    
    const directionStyles = direction === 'vertical' ? 'flex-col' : 'flex-row'
    
    const spacingMap = {
      xs: direction === 'vertical' ? 'space-y-1' : 'space-x-1',
      sm: direction === 'vertical' ? 'space-y-2' : 'space-x-2',
      md: direction === 'vertical' ? 'space-y-4' : 'space-x-4',
      lg: direction === 'vertical' ? 'space-y-6' : 'space-x-6',
      xl: direction === 'vertical' ? 'space-y-8' : 'space-x-8',
    }
    
    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    }
    
    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    }
    
    const stackClasses = `${baseStyles} ${directionStyles} ${spacingMap[spacing]} ${alignMap[align]} ${justifyMap[justify]} ${className}`
    
    return (
      <div
        ref={ref}
        className={stackClasses}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Stack.displayName = 'Stack'

export default Stack