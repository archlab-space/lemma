'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Badge } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { LoadingState } from '@/components/ui'

interface SearchResult {
  messageId: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  sessionId: string
  sessionTitle: string
  documentName: string
  highlights: string[]
  context?: {
    before?: string
    after?: string
  }
}

interface MessageSearchProps {
  sessionId?: string
  documentId?: string
  onResultClick?: (result: SearchResult) => void
  placeholder?: string
  debounceMs?: number
  maxResults?: number
  className?: string
}

const MessageSearch: React.FC<MessageSearchProps> = ({
  sessionId,
  documentId,
  onResultClick,
  placeholder = "Search your chat messages...",
  debounceMs = 300,
  maxResults = 20,
  className = '',
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filters, setFilters] = useState({
    role: 'all' as 'all' | 'user' | 'assistant',
    timeRange: 'all' as 'all' | 'today' | 'week' | 'month',
  })

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch(query)
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [query, filters, debounceMs, sessionId, documentId])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      // Mock search - replace with actual implementation
      const mockResults = await mockMessageSearch(searchQuery, filters, maxResults)
      setResults(mockResults)
      
      // Add to search history
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory(prev => [searchQuery, ...prev.slice(0, 4)])
      }
    } catch (err) {
      setError('Failed to search messages')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const mockMessageSearch = async (
    query: string,
    filters: any,
    limit: number
  ): Promise<SearchResult[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const mockResults: SearchResult[] = [
      {
        messageId: '1',
        content: `I have a question about ${query} and how it relates to the methodology discussed in the paper.`,
        role: 'user',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        sessionId: 'session-1',
        sessionTitle: 'Discussion on Machine Learning',
        documentName: 'ML_Research_Paper.pdf',
        highlights: [query],
        context: {
          before: 'Looking at the results section,',
          after: 'Could you explain this further?'
        }
      },
      {
        messageId: '2',
        content: `Based on the document, ${query} is implemented using a novel approach that combines several techniques.`,
        role: 'assistant',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000),
        sessionId: 'session-1',
        sessionTitle: 'Discussion on Machine Learning',
        documentName: 'ML_Research_Paper.pdf',
        highlights: [query],
        context: {
          before: 'The authors describe their methodology in detail.',
          after: 'This approach has several advantages over traditional methods.'
        }
      },
      {
        messageId: '3',
        content: `Can you provide more examples of ${query} in real-world applications?`,
        role: 'user',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        sessionId: 'session-2',
        sessionTitle: 'Applications Discussion',
        documentName: 'Applications_Overview.pdf',
        highlights: [query],
      }
    ]

    return mockResults.slice(0, limit)
  }

  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights.length) return text

    let highlightedText = text
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
    })

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setError(null)
  }

  const selectSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
  }

  return (
    <Card variant="outlined" className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Search Messages</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Stack spacing="md">
          {/* Search Input */}
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              onFocus={() => setShowSuggestions(searchHistory.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              rightIcon={
                query && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearSearch}
                    className="p-1 h-auto"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                )
              }
            />

            {/* Search suggestions */}
            {showSuggestions && searchHistory.length > 0 && (
              <Card 
                variant="outlined" 
                className="absolute top-full left-0 right-0 z-10 mt-1 bg-white shadow-lg"
              >
                <CardContent className="p-2">
                  <div className="text-xs font-medium text-gray-500 mb-2">Recent searches</div>
                  <Stack spacing="xs">
                    {searchHistory.map((item, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        onClick={() => selectSuggestion(item)}
                        className="justify-start text-left p-2 h-auto"
                      >
                        <svg className="w-3 h-3 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {item}
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Filters */}
          <Flex gap="md" wrap="wrap">
            <select
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value as any }))}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="all">All messages</option>
              <option value="user">My messages</option>
              <option value="assistant">AI responses</option>
            </select>
            
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
          </Flex>

          {/* Loading State */}
          {isSearching && (
            <LoadingState size="sm" message="Searching messages..." />
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-4">
              <div className="text-red-500 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* No Results */}
          {!isSearching && query && results.length === 0 && !error && (
            <div className="text-center py-6">
              <div className="text-gray-400 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                No messages found for "{query}"
              </p>
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div>
              <Flex justify="between" align="center" className="mb-3">
                <span className="text-sm text-gray-600">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </span>
              </Flex>

              <Stack spacing="sm" className="max-h-96 overflow-y-auto">
                {results.map((result) => (
                  <Card 
                    key={result.messageId} 
                    variant="outlined" 
                    className="bg-gray-50 hover:bg-white cursor-pointer transition-colors"
                    onClick={() => onResultClick?.(result)}
                  >
                    <CardContent className="p-3">
                      <Stack spacing="sm">
                        <Flex justify="between" align="start">
                          <div className="flex-1 min-w-0">
                            <Flex gap="xs" align="center" className="mb-2">
                              <Badge 
                                variant={result.role === 'user' ? 'default' : 'info'} 
                                size="sm"
                              >
                                {result.role === 'user' ? 'You' : 'AI'}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatRelativeTime(result.timestamp)}
                              </span>
                            </Flex>
                            
                            <p className="text-xs text-gray-600 mb-1">
                              {result.sessionTitle} • {result.documentName}
                            </p>
                          </div>
                        </Flex>

                        <div className="text-sm leading-relaxed">
                          {result.context?.before && (
                            <span className="text-gray-500">...{result.context.before} </span>
                          )}
                          {highlightText(result.content, result.highlights)}
                          {result.context?.after && (
                            <span className="text-gray-500"> {result.context.after}...</span>
                          )}
                        </div>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default MessageSearch