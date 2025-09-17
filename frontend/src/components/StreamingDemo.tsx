'use client'

import React, { useState, useCallback } from 'react'
import { useStreamingSSE } from '@/hooks/useStreamingSSE'

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
  timestamp?: number
  [key: string]: unknown
}

interface StreamingTextV2Props {
  endpoint: string
  className?: string
  autoReconnect?: boolean
}

export function StreamingTextV2({ 
  endpoint, 
  className = '',
  autoReconnect = true
}: StreamingTextV2Props) {
  const [content, setContent] = useState('')
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [metadata, setMetadata] = useState<StreamEvent | null>(null)

  const handleMessage = useCallback((event: StreamEvent) => {
    setEvents(prev => [...prev, { ...event, timestamp: Date.now() }])

    if (event.type === 'content' && event.content) {
      setContent(prev => prev + event.content)
    } else if (event.type === 'metadata') {
      setMetadata(event)
    } else if (event.type === 'done') {
      console.log('Stream completed:', event)
    } else if (event.type === 'error') {
      console.error('Stream error:', event.message)
    }
  }, [])

  const handleError = useCallback((error: Error) => {
    console.error('SSE Connection error:', error.message)
  }, [])

  const handleOpen = useCallback(() => {
    console.log('SSE Connection opened')
    setContent('')
    setEvents([])
    setMetadata(null)
  }, [])

  const handleClose = useCallback(() => {
    console.log('SSE Connection closed')
  }, [])

  const { isConnected, error, connect, disconnect } = useStreamingSSE({
    onMessage: handleMessage,
    onError: handleError,
    onOpen: handleOpen,
    onClose: handleClose,
    maxRetries: autoReconnect ? 3 : 0,
    retryDelay: 1000
  })

  const startStream = () => {
    connect(endpoint)
  }

  const stopStream = () => {
    disconnect()
  }

  return (
    <div className={`streaming-text-v2 ${className}`}>
      <div className="controls mb-4 flex gap-2 items-center">
        <button
          onClick={startStream}
          disabled={isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {isConnected ? 'Streaming...' : 'Start Stream'}
        </button>
        
        <button
          onClick={stopStream}
          disabled={!isConnected}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-400"
        >
          Stop Stream
        </button>

        <div className="status flex items-center gap-2 ml-4">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {metadata && (
        <div className="metadata mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm text-blue-700">
            <strong>Stream Info:</strong> {metadata.model} 
            (temp: {metadata.temperature}, tokens: ~{metadata.estimated_tokens})
          </div>
        </div>
      )}

      <div className="content-area grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="content-panel">
          <h4 className="font-semibold mb-2">Streaming Content</h4>
          <div className="content p-4 border rounded bg-gray-50 min-h-[200px] whitespace-pre-wrap">
            {content || 'Click "Start Stream" to begin...'}
            {isConnected && (
              <span className="cursor animate-pulse ml-1">▊</span>
            )}
          </div>
        </div>

        <div className="events-panel">
          <h4 className="font-semibold mb-2">Raw Events ({events.length})</h4>
          <div className="events max-h-[200px] overflow-y-auto border rounded p-2 text-xs bg-gray-50">
            {events.length === 0 ? (
              <div className="text-gray-500">No events received yet...</div>
            ) : (
              events.slice(-20).map((event: StreamEvent, index: number) => ( // Show last 20 events
                <div key={index} className="mb-1 p-1 bg-white rounded border">
                  <div className="font-mono text-green-600">{event.type}</div>
                  {event.content && (
                    <div className="text-gray-700 truncate">&ldquo;{event.content}&rdquo;</div>
                  )}
                  <div className="text-gray-500 text-xs">
                    {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function StreamingDemo() {
  return (
    <div className="improved-streaming-demo max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Improved Streaming Pipeline</h1>
      <p className="text-gray-600 mb-8">Using eventsource-parser for robust SSE handling</p>
      
      <div className="demos space-y-8">
        <div className="demo-section">
          <h2 className="text-xl font-semibold mb-4">🚀 Typing Effect with Reconnection</h2>
          <StreamingTextV2
            endpoint="http://localhost:8787/api/v1/streaming/typing?text=This%20demonstrates%20improved%20SSE%20parsing%20with%20automatic%20reconnection%20and%20robust%20error%20handling."
            className="typing-effect"
          />
        </div>

        <div className="demo-section">
          <h2 className="text-xl font-semibold mb-4">🤖 AI Response Simulation</h2>
          <StreamingTextV2
            endpoint="http://localhost:8787/api/v1/streaming/ai-response"
            className="ai-response"
          />
        </div>

        <div className="demo-section">
          <h2 className="text-xl font-semibold mb-4">📡 Server-Sent Events Stream</h2>
          <StreamingTextV2
            endpoint="http://localhost:8787/api/v1/streaming/sse?count=15&interval=0.8"
            className="sse-demo"
            autoReconnect={false} // Disable auto-reconnect for finite streams
          />
        </div>
      </div>
      
      <div className="improvements mt-12 p-6 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-green-800">✅ Improvements with eventsource-parser</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-green-700">
          <li><strong>Robust SSE Parsing:</strong> Handles all Server-Sent Events specification edge cases</li>
          <li><strong>Automatic Reconnection:</strong> Reconnects with exponential backoff on connection drops</li>
          <li><strong>Event Type Support:</strong> Proper handling of event types, IDs, and retry intervals</li>
          <li><strong>Buffer Management:</strong> Correct handling of partial messages and chunk boundaries</li>
          <li><strong>Error Recovery:</strong> Graceful error handling with configurable retry logic</li>
          <li><strong>Connection State:</strong> Real-time connection status with visual indicators</li>
          <li><strong>Event Inspection:</strong> Debug view showing raw events and metadata</li>
        </ul>
      </div>

      <div className="comparison mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">🔄 Manual vs eventsource-parser</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="manual-approach">
            <h4 className="font-semibold text-red-600 mb-2">❌ Manual Parsing Issues:</h4>
            <ul className="list-disc list-inside space-y-1 text-red-700">
              <li>Hand-parsing &ldquo;ata: &rdquo; lines</li>
              <li>No automatic reconnection</li>
              <li>Buffer splitting problems</li>
              <li>Missing event types</li>
              <li>No retry logic</li>
            </ul>
          </div>
          <div className="parser-approach">
            <h4 className="font-semibold text-green-600 mb-2">✅ eventsource-parser Benefits:</h4>
            <ul className="list-disc list-inside space-y-1 text-green-700">
              <li>Spec-compliant SSE parsing</li>
              <li>Built-in reconnection logic</li>
              <li>Proper event boundaries</li>
              <li>Full SSE protocol support</li>
              <li>Configurable retry strategy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}