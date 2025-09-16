'use client'

import { useState, useRef, useCallback } from 'react'
import { createParser, type EventSourceMessage, type ParseError } from 'eventsource-parser'

interface StreamEvent {
  type: string
  data?: string
  id?: string
  event?: string
  retry?: number
  content?: string
  message?: string
  model?: string
  temperature?: number
  estimated_tokens?: number
  [key: string]: unknown
}

interface UseStreamingSSEOptions {
  onMessage?: (event: StreamEvent) => void
  onError?: (error: Error) => void
  onOpen?: () => void
  onClose?: () => void
  maxRetries?: number
  retryDelay?: number
}

interface UseStreamingSSEReturn {
  isConnected: boolean
  error: string | null
  connect: (url: string, options?: RequestInit) => Promise<void>
  disconnect: () => void
  send: (data: unknown) => void
}

export function useStreamingSSE({
  onMessage,
  onError,
  onOpen,
  onClose,
  maxRetries = 3,
  retryDelay = 1000
}: UseStreamingSSEOptions = {}): UseStreamingSSEReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const retriesRef = useRef(0)
  const urlRef = useRef<string>('')
  const optionsRef = useRef<RequestInit>({})

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsConnected(false)
    retriesRef.current = 0
    onClose?.()
  }, [onClose])

  const connect = useCallback(async (url: string, options: RequestInit = {}) => {
    // Store for potential reconnection
    urlRef.current = url
    optionsRef.current = options
    
    // Disconnect any existing connection
    disconnect()
    
    try {
      setError(null)
      
      // Create new abort controller
      abortControllerRef.current = new AbortController()
      
      // Set up request with SSE headers
      const requestOptions: RequestInit = {
        ...options,
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...options.headers,
        },
      }

      const response = await fetch(url, requestOptions)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body available')
      }

      setIsConnected(true)
      retriesRef.current = 0 // Reset retry count on successful connection
      onOpen?.()

      // Create SSE parser
      const parser = createParser({
        onEvent: (event: EventSourceMessage) => {
          try {
            // Try to parse data as JSON, fall back to raw string
            let parsedData: unknown = event.data
            let jsonData: Record<string, unknown> | null = null
            
            try {
              jsonData = JSON.parse(event.data) as Record<string, unknown>
              parsedData = jsonData
            } catch {
              // Keep as string if not valid JSON
            }

            const streamEvent: StreamEvent = {
              type: (jsonData?.type as string) || event.event || 'message',
              data: event.data,
              id: event.id,
              event: event.event,
              ...(jsonData && typeof jsonData === 'object' ? jsonData : {})
            }

            onMessage?.(streamEvent)
          } catch (err) {
            console.warn('Failed to process SSE event:', err, event)
          }
        },
        onRetry: (retryInterval: number) => {
          // Handle reconnection interval
          console.log('SSE reconnection interval:', retryInterval)
        },
        onError: (error: ParseError) => {
          console.warn('SSE parsing error:', error)
        }
      })

      // Process the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            console.log('SSE stream completed normally')
            break
          }

          // Feed chunk to parser
          const chunk = decoder.decode(value, { stream: true })
          parser.feed(chunk)
        }
      } finally {
        reader.releaseLock()
      }

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('SSE connection aborted')
          return // Don't treat abort as error
        }

        const errorMessage = err.message || 'Unknown SSE error'
        setError(errorMessage)
        onError?.(err)

        // Attempt reconnection if within retry limit
        if (retriesRef.current < maxRetries) {
          retriesRef.current++
          console.log(`SSE reconnection attempt ${retriesRef.current}/${maxRetries}`)
          
          setTimeout(() => {
            if (urlRef.current && !abortControllerRef.current?.signal.aborted) {
              connect(urlRef.current, optionsRef.current)
            }
          }, retryDelay * retriesRef.current) // Exponential backoff
        } else {
          console.error('SSE max retries exceeded')
        }
      }
    } finally {
      if (isConnected) {
        setIsConnected(false)
        onClose?.()
      }
    }
  }, [disconnect, onMessage, onError, onOpen, onClose, maxRetries, retryDelay, isConnected])

  // Send is not typically used with SSE, but included for completeness
  const send = useCallback((data: unknown) => {
    console.warn('SSE is a one-way protocol. Use WebSocket for bidirectional communication.')
    // Suppress unused parameter warning
    void data
  }, [])

  return {
    isConnected,
    error,
    connect,
    disconnect,
    send
  }
}