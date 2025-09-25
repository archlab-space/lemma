import React from 'react'
import Link from 'next/link'

export interface SkipLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

const SkipLink: React.FC<SkipLinkProps> = ({ 
  href, 
  children, 
  className = '' 
}) => {
  return (
    <Link
      href={href}
      className={`
        absolute left-0 top-0 z-50 p-3 bg-blue-600 text-white font-medium
        transform -translate-y-full transition-transform duration-200
        focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
    >
      {children}
    </Link>
  )
}

export default SkipLink