import React from 'react'

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 12
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 12
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 12
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 12
  }
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ 
    className = '',
    cols = 1,
    gap = 'md',
    responsive,
    children,
    ...props 
  }, ref) => {
    const baseStyles = 'grid'
    
    const colsMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      12: 'grid-cols-12',
    }

    const responsiveColsMap = {
      sm: {
        1: 'sm:grid-cols-1',
        2: 'sm:grid-cols-2',
        3: 'sm:grid-cols-3',
        4: 'sm:grid-cols-4',
        5: 'sm:grid-cols-5',
        6: 'sm:grid-cols-6',
        12: 'sm:grid-cols-12',
      },
      md: {
        1: 'md:grid-cols-1',
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-3',
        4: 'md:grid-cols-4',
        5: 'md:grid-cols-5',
        6: 'md:grid-cols-6',
        12: 'md:grid-cols-12',
      },
      lg: {
        1: 'lg:grid-cols-1',
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
        5: 'lg:grid-cols-5',
        6: 'lg:grid-cols-6',
        12: 'lg:grid-cols-12',
      },
      xl: {
        1: 'xl:grid-cols-1',
        2: 'xl:grid-cols-2',
        3: 'xl:grid-cols-3',
        4: 'xl:grid-cols-4',
        5: 'xl:grid-cols-5',
        6: 'xl:grid-cols-6',
        12: 'xl:grid-cols-12',
      },
    }

    const gapMap = {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    }

    const responsiveClasses = responsive ? [
      responsive.sm && responsiveColsMap.sm[responsive.sm],
      responsive.md && responsiveColsMap.md[responsive.md],
      responsive.lg && responsiveColsMap.lg[responsive.lg],
      responsive.xl && responsiveColsMap.xl[responsive.xl],
    ].filter(Boolean).join(' ') : ''
    
    const gridClasses = `${baseStyles} ${colsMap[cols]} ${gapMap[gap]} ${responsiveClasses} ${className}`
    
    return (
      <div
        ref={ref}
        className={gridClasses}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Grid.displayName = 'Grid'

export default Grid