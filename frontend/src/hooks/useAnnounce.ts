'use client'

import { useCallback, useRef } from 'react'

export interface UseAnnounceOptions {
  politeness?: 'polite' | 'assertive'
  delay?: number
}

const useAnnounce = (options: UseAnnounceOptions = {}) => {
  const { politeness = 'polite', delay = 100 } = options
  const regionRef = useRef<HTMLDivElement | null>(null)

  const announce = useCallback((message: string) => {
    if (!regionRef.current) {
      // Create a live region if it doesn't exist
      const region = document.createElement('div')
      region.setAttribute('aria-live', politeness)
      region.setAttribute('aria-atomic', 'true')
      region.className = 'sr-only'
      document.body.appendChild(region)
      regionRef.current = region
    }

    const region = regionRef.current

    // Clear the region first
    region.textContent = ''

    // Set the message after a short delay to ensure screen readers announce it
    setTimeout(() => {
      if (region) {
        region.textContent = message
      }
    }, delay)
  }, [politeness, delay])

  const clear = useCallback(() => {
    if (regionRef.current) {
      regionRef.current.textContent = ''
    }
  }, [])

  return { announce, clear }
}

export default useAnnounce