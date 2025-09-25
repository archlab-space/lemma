import React from 'react'

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'row-reverse' | 'col' | 'col-reverse'
  wrap?: 'wrap' | 'wrap-reverse' | 'nowrap'
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  gap?: 'sm' | 'md' | 'lg' | 'xl'
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ 
    className = '',
    direction = 'row',
    wrap = 'nowrap',
    justify = 'start',
    align = 'start',
    gap,
    children,
    ...props 
  }, ref) => {
    const baseStyles = 'flex'
    
    const directionMap = {
      row: 'flex-row',
      'row-reverse': 'flex-row-reverse',
      col: 'flex-col',
      'col-reverse': 'flex-col-reverse',
    }
    
    const wrapMap = {
      wrap: 'flex-wrap',
      'wrap-reverse': 'flex-wrap-reverse',
      nowrap: 'flex-nowrap',
    }
    
    const justifyMap = {
      start: 'justify-start',
      end: 'justify-end',
      center: 'justify-center',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    }
    
    const alignMap = {
      start: 'items-start',
      end: 'items-end',
      center: 'items-center',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    }
    
    const gapMap = gap ? {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    }[gap] : ''
    
    const flexClasses = `${baseStyles} ${directionMap[direction]} ${wrapMap[wrap]} ${justifyMap[justify]} ${alignMap[align]} ${gapMap} ${className}`
    
    return (
      <div
        ref={ref}
        className={flexClasses}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Flex.displayName = 'Flex'

export default Flex