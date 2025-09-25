'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Skeleton } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { LoadingState } from '@/components/ui'

interface SummarySection {
  id: string
  title: string
  content: string
  confidence: number
  page?: number
}

interface DocumentSummaryData {
  executiveSummary: string
  keyFindings: string[]
  methodology?: string
  conclusions: string[]
  sections: SummarySection[]
  readingTime: number
  complexity: 'beginner' | 'intermediate' | 'advanced'
  topics: string[]
}

interface DocumentSummaryProps {
  summary?: DocumentSummaryData
  isLoading?: boolean
  error?: string
  onRegenerateSummary?: () => void
  onSectionClick?: (sectionId: string) => void
  compact?: boolean
  className?: string
}

const DocumentSummary: React.FC<DocumentSummaryProps> = ({
  summary,
  isLoading = false,
  error,
  onRegenerateSummary,
  onSectionClick,
  compact = false,
  className = '',
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (expandedSections.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'success'
      case 'intermediate': return 'warning'
      case 'advanced': return 'error'
      default: return 'default'
    }
  }

  const formatReadingTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min'
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  if (isLoading) {
    return (
      <Card variant="outlined" className={className}>
        <CardHeader>
          <CardTitle>Document Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack spacing="md">
            <Skeleton lines={3} />
            <Skeleton lines={2} />
            <Flex gap="sm">
              <Skeleton width="80px" height="24px" variant="rectangular" />
              <Skeleton width="100px" height="24px" variant="rectangular" />
            </Flex>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="outlined" className={className}>
        <CardHeader>
          <Flex justify="between" align="center">
            <CardTitle>Document Summary</CardTitle>
            {onRegenerateSummary && (
              <Button size="sm" variant="outline" onClick={onRegenerateSummary}>
                Retry
              </Button>
            )}
          </Flex>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Failed to Generate Summary</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card variant="outlined" className={className}>
        <CardHeader>
          <Flex justify="between" align="center">
            <CardTitle>Document Summary</CardTitle>
            {onRegenerateSummary && (
              <Button size="sm" variant="primary" onClick={onRegenerateSummary}>
                Generate Summary
              </Button>
            )}
          </Flex>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Summary Available</h3>
            <p className="text-sm text-gray-500">
              Generate an AI-powered summary to quickly understand this document.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="outlined" className={className}>
      <CardHeader>
        <Flex justify="between" align="center">
          <CardTitle>Document Summary</CardTitle>
          
          <Flex gap="sm" align="center">
            <Badge variant={getComplexityColor(summary.complexity)}>
              {summary.complexity}
            </Badge>
            <Badge variant="default">
              {formatReadingTime(summary.readingTime)}
            </Badge>
            {onRegenerateSummary && (
              <Button size="sm" variant="outline" onClick={onRegenerateSummary}>
                Regenerate
              </Button>
            )}
          </Flex>
        </Flex>
      </CardHeader>

      <CardContent>
        <Stack spacing="lg">
          {/* Executive Summary */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Executive Summary</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {summary.executiveSummary}
            </p>
          </div>

          {/* Topics */}
          {summary.topics.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Key Topics</h3>
              <Flex gap="xs" wrap="wrap">
                {summary.topics.map((topic, index) => (
                  <Badge key={index} variant="default" size="sm">
                    {topic}
                  </Badge>
                ))}
              </Flex>
            </div>
          )}

          {/* Key Findings */}
          {summary.keyFindings.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Key Findings</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {summary.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-1">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Methodology */}
          {summary.methodology && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Methodology</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {summary.methodology}
              </p>
            </div>
          )}

          {/* Conclusions */}
          {summary.conclusions.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Conclusions</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {summary.conclusions.map((conclusion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-1">•</span>
                    <span>{conclusion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section Summaries */}
          {!compact && summary.sections.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Section Breakdown</h3>
              <Stack spacing="sm">
                {summary.sections.map((section) => {
                  const isExpanded = expandedSections.has(section.id)
                  return (
                    <Card key={section.id} variant="outlined" className="bg-gray-50">
                      <CardContent className="p-3">
                        <Flex justify="between" align="start" className="mb-2">
                          <div className="flex-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSection(section.id)}
                              className="p-0 h-auto font-medium text-gray-900 hover:text-blue-600"
                            >
                              <Flex gap="sm" align="center">
                                <svg 
                                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                {section.title}
                              </Flex>
                            </Button>
                          </div>
                          <Flex gap="xs" align="center">
                            {section.page && (
                              <Badge variant="default" size="sm">
                                p. {section.page}
                              </Badge>
                            )}
                            <Badge 
                              variant={section.confidence > 0.8 ? 'success' : section.confidence > 0.6 ? 'warning' : 'error'}
                              size="sm"
                            >
                              {Math.round(section.confidence * 100)}%
                            </Badge>
                            {onSectionClick && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onSectionClick(section.id)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </Button>
                            )}
                          </Flex>
                        </Flex>
                        
                        {isExpanded && (
                          <p className="text-sm text-gray-700 leading-relaxed ml-6">
                            {section.content}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </Stack>
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default DocumentSummary