'use client'

import { useCallback, useEffect, useRef } from 'react'

export interface UseKeyboardNavigationOptions {
  orientation?: 'horizontal' | 'vertical' | 'both'
  wrap?: boolean
  preventDefault?: boolean
}

const useKeyboardNavigation = (
  options: UseKeyboardNavigationOptions = {}
) => {
  const { 
    orientation = 'both', 
    wrap = true, 
    preventDefault = true 
  } = options
  
  const containerRef = useRef<HTMLElement>(null)
  const currentIndex = useRef<number>(0)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []
    
    const focusableSelectors = [
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
    ].join(', ')

    return Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[]
  }, [])

  const focusElement = useCallback((index: number) => {
    const elements = getFocusableElements()
    if (elements.length === 0) return

    let newIndex = index
    
    if (wrap) {
      newIndex = ((index % elements.length) + elements.length) % elements.length
    } else {
      newIndex = Math.max(0, Math.min(index, elements.length - 1))
    }

    currentIndex.current = newIndex
    elements[newIndex]?.focus()
  }, [getFocusableElements, wrap])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key } = event
    const elements = getFocusableElements()
    
    if (elements.length === 0) return

    let handled = false

    switch (key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          focusElement(currentIndex.current - 1)
          handled = true
        }
        break
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          focusElement(currentIndex.current + 1)
          handled = true
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          focusElement(currentIndex.current - 1)
          handled = true
        }
        break
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          focusElement(currentIndex.current + 1)
          handled = true
        }
        break
      case 'Home':
        focusElement(0)
        handled = true
        break
      case 'End':
        focusElement(elements.length - 1)
        handled = true
        break
    }

    if (handled && preventDefault) {
      event.preventDefault()
    }
  }, [orientation, focusElement, getFocusableElements, preventDefault])

  const handleFocus = useCallback((event: FocusEvent) => {
    const elements = getFocusableElements()
    const target = event.target as HTMLElement
    const index = elements.indexOf(target)
    
    if (index >= 0) {
      currentIndex.current = index
    }
  }, [getFocusableElements])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown)
    container.addEventListener('focus', handleFocus, true)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('focus', handleFocus, true)
    }
  }, [handleKeyDown, handleFocus])

  return {
    containerRef,
    focusElement,
    getFocusableElements,
  }
}

export default useKeyboardNavigation