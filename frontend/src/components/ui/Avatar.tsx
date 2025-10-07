'use client'

import React, { useState } from 'react'
import Image from 'next/image'

interface AvatarProps {
  src?: string | null
  alt: string
  fallback: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
  }

  const sizeValue = {
    sm: '32px',
    md: '40px',
    lg: '48px',
  }

  const showImage = src && !imageError

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden ring-2 ring-emerald-100 ${className}`}>
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={sizeValue[size]}
          unoptimized
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
          <span className={`${sizeClasses[size].split(' ')[2]} font-medium text-white`}>
            {fallback}
          </span>
        </div>
      )}
    </div>
  )
}

Avatar.displayName = 'Avatar'

export default Avatar
