'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Badge } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { LoadingState } from '@/components/ui'

interface SearchResult {
  id: string
  content: string
  page: number
  section?: string
  score: number
  highlights: string[]
  context: {
    before: string
    after: string
  }
}

interface DocumentSearchProps {
  documentId: string
  onResultClick?: (result: SearchResult) => void
  placeholder?: string
  debounceMs?: number
  maxResults?: number
  className?: string
}

const DocumentSearch: React.FC<DocumentSearchProps> = ({
  documentId,
  onResultClick,
  placeholder = "Search within document...",
  debounceMs = 300,
  maxResults = 10,
  className = '',
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch(query)
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [query, debounceMs, documentId])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      // Mock API call - replace with actual search implementation
      const mockResults = await mockDocumentSearch(documentId, searchQuery, maxResults)
      setResults(mockResults)
      
      // Add to search history
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory(prev => [searchQuery, ...prev.slice(0, 4)])
      }
    } catch (err) {
      setError('Failed to search document')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Mock search function - replace with actual API call
  const mockDocumentSearch = async (
    docId: string, 
    query: string, 
    limit: number
  ): Promise<SearchResult[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock results
    const mockResults: SearchResult[] = [
      {
        id: '1',
        content: `Machine learning algorithms have shown remarkable success in various domains including natural language processing, computer vision, and ${query}.`,
        page: 5,
        section: 'Introduction',
        score: 0.95,
        highlights: [query],
        context: {
          before: 'In recent years, artificial intelligence has advanced rapidly.',
          after: 'These developments have opened new possibilities for automation.'
        }
      },
      {
        id: '2',
        content: `The implementation of ${query} requires careful consideration of computational resources and algorithmic complexity.`,
        page: 12,
        section: 'Methodology',
        score: 0.87,
        highlights: [query],
        context: {
          before: 'Our approach focuses on efficient processing.',
          after: 'Results show significant improvements in performance.'
        }
      },
      {
        id: '3',
        content: `Future research directions should explore the integration of ${query} with emerging technologies.`,
        page: 28,
        section: 'Conclusions',
        score: 0.73,
        highlights: [query],
        context: {
          before: 'Based on our findings, we recommend several paths forward.',
          after: 'This could lead to breakthrough innovations.'
        }
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
        <CardTitle className="text-base">Search Document</CardTitle>
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

          {/* Loading State */}
          {isSearching && (
            <LoadingState size="sm" message="Searching document..." />
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

          {/* Search Results */}
          {!isSearching && query && results.length === 0 && !error && (
            <div className="text-center py-6">
              <div className="text-gray-400 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                No results found for "{query}"
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <Flex justify="between" align="center" className="mb-3">
                <span className="text-sm text-gray-600">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </span>
                {results.length === maxResults && (
                  <span className="text-xs text-gray-500">
                    Showing top {maxResults} results
                  </span>
                )}
              </Flex>

              <Stack spacing="sm" className="max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <Card 
                    key={result.id} 
                    variant="outlined" 
                    className="bg-gray-50 hover:bg-white cursor-pointer transition-colors"
                    onClick={() => onResultClick?.(result)}
                  >
                    <CardContent className="p-3">
                      <Stack spacing="sm">
                        <Flex justify="between" align="start">
                          <div className="flex-1">
                            <Flex gap="xs" align="center" className="mb-1">
                              <Badge variant="default" size="sm">
                                Page {result.page}
                              </Badge>
                              {result.section && (
                                <Badge variant="default" size="sm">
                                  {result.section}
                                </Badge>
                              )}
                              <Badge 
                                variant={result.score > 0.8 ? 'success' : 'default'} 
                                size="sm"
                              >
                                {Math.round(result.score * 100)}% match
                              </Badge>
                            </Flex>
                          </div>
                        </Flex>

                        <div className="text-sm leading-relaxed">
                          <span className="text-gray-500">{result.context.before} </span>
                          {highlightText(result.content, result.highlights)}
                          <span className="text-gray-500"> {result.context.after}</span>
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

export default DocumentSearch