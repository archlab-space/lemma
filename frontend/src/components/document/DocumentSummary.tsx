'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import type { DocumentEnrichment } from '@/lib/api/types'

interface DocumentSummaryProps {
  enrichment?: DocumentEnrichment
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
        return JSON.parse(enrichment) as DocumentEnrichment
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
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Abstract</h3>
              <p className="font-serif text-base text-gray-800 leading-loose">
                {abstract}
              </p>
            </div>
          )}

          {/* Key Topics / Related Topics */}
          {parsedEnrichment?.related_topics && parsedEnrichment.related_topics.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Topics</h3>
              <Flex gap="sm" wrap="wrap">
                {parsedEnrichment.related_topics.map((topic, index) => (
                  <Badge key={index} variant="info" size="md">
                    {topic}
                  </Badge>
                ))}
              </Flex>
            </div>
          )}

          {/* Research Questions */}
          {parsedEnrichment?.research_questions && parsedEnrichment.research_questions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Research Questions</h3>
              <ul className="text-base text-gray-800 space-y-2">
                {parsedEnrichment.research_questions.map((question, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-cyan-600 font-bold text-lg mt-0.5">•</span>
                    <span className="font-serif leading-relaxed">{question}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Contributions */}
          {parsedEnrichment?.key_contributions && parsedEnrichment.key_contributions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Contributions</h3>
              <ul className="text-base text-gray-800 space-y-2">
                {parsedEnrichment.key_contributions.map((contribution, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-emerald-600 font-bold text-lg mt-0.5">•</span>
                    <span className="font-serif leading-relaxed">{contribution}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Methodology */}
          {parsedEnrichment?.methodology_summary && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Methodology</h3>
              <p className="font-serif text-base text-gray-800 leading-loose">
                {parsedEnrichment.methodology_summary}
              </p>
            </div>
          )}

          {/* Key Concepts */}
          {parsedEnrichment?.key_concepts && parsedEnrichment.key_concepts.length > 0 && !compact && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Concepts</h3>
              <Flex gap="sm" wrap="wrap">
                {parsedEnrichment.key_concepts.map((concept, index) => (
                  <Badge key={index} variant="default" size="md">
                    {concept}
                  </Badge>
                ))}
              </Flex>
            </div>
          )}

          {/* Technical Terms */}
          {parsedEnrichment?.technical_terms && parsedEnrichment.technical_terms.length > 0 && !compact && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Terms</h3>
              <Stack spacing="sm">
                {parsedEnrichment.technical_terms.slice(0, 5).map((term, index) => {
                  const isExpanded = expandedSections.has(`term-${index}`)
                  return (
                    <Card key={index} variant="outlined" className="bg-emerald-50/30 border-emerald-200">
                      <CardContent className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection(`term-${index}`)}
                          className="p-0 h-auto font-semibold text-gray-900 hover:text-emerald-700 w-full justify-start"
                        >
                          <Flex gap="sm" align="center">
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
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
                          <p className="font-serif text-base text-gray-800 leading-relaxed ml-7 mt-3">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Future Work Suggestions</h3>
              <ul className="text-base text-gray-800 space-y-2">
                {parsedEnrichment.future_work_suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-cyan-600 font-bold text-lg mt-0.5">•</span>
                    <span className="font-serif leading-relaxed">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Citation Impact Prediction */}
          {parsedEnrichment?.citation_impact_prediction && !compact && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Citation Impact Prediction</h3>
              <Card variant="outlined" className="bg-gradient-to-br from-cyan-50 to-emerald-50 border-emerald-200">
                <CardContent className="p-5">
                  <Flex gap="lg" align="start">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-700">
                        ~{parsedEnrichment.citation_impact_prediction.predicted_citations}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Predicted Citations</div>
                    </div>
                    <div className="flex-1">
                      <Badge variant="success" size="md" className="mb-3">
                        {Math.round(parsedEnrichment.citation_impact_prediction.confidence * 100)}% confidence
                      </Badge>
                      <p className="font-serif text-base text-gray-800 leading-relaxed">
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
