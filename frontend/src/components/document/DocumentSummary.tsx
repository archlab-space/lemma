'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Skeleton } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { LoadingState } from '@/components/ui'

interface EnrichmentData {
  research_questions?: string[]
  key_contributions?: string[]
  methodology_summary?: string
  reading_time_minutes?: number
  readability_score?: number
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  related_topics?: string[]
  key_concepts?: string[]
  technical_terms?: Array<{ term: string; definition: string }>
  future_work_suggestions?: string[]
  citation_impact_prediction?: {
    predicted_citations: number
    confidence: number
    reasoning: string
  }
}

interface DocumentSummaryProps {
  enrichment?: EnrichmentData
  abstract?: string | null
  compact?: boolean
  className?: string
}

const DocumentSummary: React.FC<DocumentSummaryProps> = ({
  enrichment,
  abstract,
  compact = false,
  className = '',
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Parse enrichment if it's a string (JSONB from API might be serialized)
  const parsedEnrichment = React.useMemo(() => {
    if (!enrichment) return null
    if (typeof enrichment === 'string') {
      try {
        return JSON.parse(enrichment) as EnrichmentData
      } catch {
        return null
      }
    }
    return enrichment
  }, [enrichment])

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (expandedSections.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'beginner': return 'success'
      case 'intermediate': return 'warning'
      case 'advanced': return 'error'
      default: return 'default'
    }
  }

  const formatReadingTime = (minutes?: number) => {
    if (!minutes) return 'Unknown'
    if (minutes < 1) return '< 1 min'
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  if (!parsedEnrichment && !abstract) {
    return (
      <Card variant="outlined" className={className}>
        <CardHeader>
          <CardTitle>Document Summary</CardTitle>
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
              This document hasn&apos;t been enriched with AI-powered analysis yet.
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
            {parsedEnrichment?.difficulty_level && (
              <Badge variant={getComplexityColor(parsedEnrichment.difficulty_level)}>
                {parsedEnrichment.difficulty_level}
              </Badge>
            )}
            {parsedEnrichment?.reading_time_minutes && (
              <Badge variant="default">
                {formatReadingTime(parsedEnrichment.reading_time_minutes)}
              </Badge>
            )}
          </Flex>
        </Flex>
      </CardHeader>

      <CardContent>
        <Stack spacing="lg">
          {/* Abstract */}
          {abstract && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Abstract</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {abstract}
              </p>
            </div>
          )}

          {/* Key Topics / Related Topics */}
          {parsedEnrichment?.related_topics && parsedEnrichment.related_topics.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Key Topics</h3>
              <Flex gap="xs" wrap="wrap">
                {parsedEnrichment.related_topics.map((topic, index) => (
                  <Badge key={index} variant="default" size="sm">
                    {topic}
                  </Badge>
                ))}
              </Flex>
            </div>
          )}

          {/* Research Questions */}
          {parsedEnrichment?.research_questions && parsedEnrichment.research_questions.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Research Questions</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {parsedEnrichment.research_questions.map((question, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-1">•</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Contributions */}
          {parsedEnrichment?.key_contributions && parsedEnrichment.key_contributions.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Key Contributions</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {parsedEnrichment.key_contributions.map((contribution, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-1">•</span>
                    <span>{contribution}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Methodology */}
          {parsedEnrichment?.methodology_summary && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Methodology</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {parsedEnrichment.methodology_summary}
              </p>
            </div>
          )}

          {/* Key Concepts */}
          {parsedEnrichment?.key_concepts && parsedEnrichment.key_concepts.length > 0 && !compact && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Key Concepts</h3>
              <Flex gap="xs" wrap="wrap">
                {parsedEnrichment.key_concepts.map((concept, index) => (
                  <Badge key={index} variant="default" size="sm">
                    {concept}
                  </Badge>
                ))}
              </Flex>
            </div>
          )}

          {/* Technical Terms */}
          {parsedEnrichment?.technical_terms && parsedEnrichment.technical_terms.length > 0 && !compact && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Technical Terms</h3>
              <Stack spacing="sm">
                {parsedEnrichment.technical_terms.slice(0, 5).map((term, index) => {
                  const isExpanded = expandedSections.has(`term-${index}`)
                  return (
                    <Card key={index} variant="outlined" className="bg-gray-50">
                      <CardContent className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection(`term-${index}`)}
                          className="p-0 h-auto font-medium text-gray-900 hover:text-blue-600 w-full justify-between"
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
                            {term.term}
                          </Flex>
                        </Button>

                        {isExpanded && (
                          <p className="text-sm text-gray-700 leading-relaxed ml-6 mt-2">
                            {term.definition}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </Stack>
            </div>
          )}

          {/* Future Work Suggestions */}
          {parsedEnrichment?.future_work_suggestions && parsedEnrichment.future_work_suggestions.length > 0 && !compact && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Future Work Suggestions</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {parsedEnrichment.future_work_suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Citation Impact Prediction */}
          {parsedEnrichment?.citation_impact_prediction && !compact && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Citation Impact Prediction</h3>
              <Card variant="outlined" className="bg-blue-50">
                <CardContent className="p-3">
                  <Flex gap="md" align="start">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        ~{parsedEnrichment.citation_impact_prediction.predicted_citations}
                      </div>
                      <div className="text-xs text-gray-600">Predicted Citations</div>
                    </div>
                    <div className="flex-1">
                      <Badge variant="default" size="sm" className="mb-2">
                        {Math.round(parsedEnrichment.citation_impact_prediction.confidence * 100)}% confidence
                      </Badge>
                      <p className="text-sm text-gray-700">
                        {parsedEnrichment.citation_impact_prediction.reasoning}
                      </p>
                    </div>
                  </Flex>
                </CardContent>
              </Card>
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default DocumentSummary
