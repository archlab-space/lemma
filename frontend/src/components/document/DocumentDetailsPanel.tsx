'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { Document } from '@/lib/api/types'

interface DocumentDetailsPanelProps {
  document: Document
  onClose?: () => void
  className?: string
}

export default function DocumentDetailsPanel({ document, onClose, className = '' }: DocumentDetailsPanelProps) {
  const [showFullAbstract, setShowFullAbstract] = useState(false)

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (status: Document['processingStatus']) => {
    switch (status) {
      case 'completed': return 'success'
      case 'processing': return 'warning'
      case 'pending': return 'info'
      case 'failed': return 'error'
      default: return 'default'
    }
  }

  return (
    <Card variant="elevated" className={`flex flex-col h-[calc(100vh-8rem)] ${className}`}>
      <CardHeader className="flex-shrink-0 border-b border-gray-100">
        <Flex align="start" gap="sm" justify="between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 leading-tight mb-1 break-words">
              {document.title || document.filename}
            </h2>
            {document.authors && document.authors.length > 0 && (
              <p className="text-sm text-gray-600 line-clamp-1">
                {document.authors.join(', ')}
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close panel"
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </Flex>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs defaultValue="summary" orientation="vertical" className="h-full flex flex-row">
          <TabsList className="flex-shrink-0 w-12 sm:w-16 lg:w-20">
            <TabsTrigger value="summary" hideLabel={true} className="lg:hidden">📊 Summary</TabsTrigger>
            <TabsTrigger value="summary" hideLabel={false} className="hidden lg:flex">📊 Summary</TabsTrigger>

            <TabsTrigger value="metadata" hideLabel={true} className="lg:hidden">📄 Metadata</TabsTrigger>
            <TabsTrigger value="metadata" hideLabel={false} className="hidden lg:flex">📄 Metadata</TabsTrigger>

            <TabsTrigger value="enrichment" hideLabel={true} className="lg:hidden">💡 Insights</TabsTrigger>
            <TabsTrigger value="enrichment" hideLabel={false} className="hidden lg:flex">💡 Insights</TabsTrigger>

            {document.outline && Array.isArray(document.outline) && document.outline.length > 0 && (
              <>
                <TabsTrigger value="outline" hideLabel={true} className="lg:hidden">📑 Outline</TabsTrigger>
                <TabsTrigger value="outline" hideLabel={false} className="hidden lg:flex">📑 Outline</TabsTrigger>
              </>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="summary" className="p-6">
              <Stack spacing="lg">
                {/* Quick Stats - Most Relevant Info */}
                {document.enrichment && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <Stack spacing="sm">
                      {document.enrichment.reading_time_minutes && (
                        <Flex align="center" gap="sm">
                          <span className="text-sm text-gray-600">⏱️ Reading Time:</span>
                          <span className="text-sm font-semibold text-blue-700">{document.enrichment.reading_time_minutes} min</span>
                        </Flex>
                      )}
                      {document.enrichment.difficulty_level && (
                        <Flex align="center" gap="sm">
                          <span className="text-sm text-gray-600">📚 Difficulty:</span>
                          <Badge
                            variant={
                              document.enrichment.difficulty_level === 'beginner' ? 'success' :
                              document.enrichment.difficulty_level === 'intermediate' ? 'warning' : 'error'
                            }
                            size="sm"
                          >
                            {document.enrichment.difficulty_level}
                          </Badge>
                        </Flex>
                      )}
                    </Stack>
                  </div>
                )}

                {/* Document Info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span>📄</span> Document Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Pages</span>
                      <span className="text-sm font-medium text-gray-900">{document.totalPages || 0}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Words</span>
                      <span className="text-sm font-medium text-gray-900">{document.totalWords?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Size</span>
                      <span className="text-sm font-medium text-gray-900">{formatFileSize(document.fileSizeBytes)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Language</span>
                      <span className="text-sm font-medium text-gray-900">{document.language || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Technical Details - Collapsible */}
                <details className="border-t pt-4">
                  <summary className="text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                    Technical Details
                  </summary>
                  <Stack spacing="sm" className="mt-3">
                    <Flex justify="between">
                      <span className="text-xs text-gray-500">Uploaded</span>
                      <span className="text-xs text-gray-700">{formatDate(document.createdAt)}</span>
                    </Flex>
                    {document.processingCompletedAt && (
                      <Flex justify="between">
                        <span className="text-xs text-gray-500">Processed</span>
                        <span className="text-xs text-gray-700">{formatDate(document.processingCompletedAt)}</span>
                      </Flex>
                    )}
                    <Flex justify="between">
                      <span className="text-xs text-gray-500">Chunks</span>
                      <span className="text-xs text-gray-700">{document.totalChunks || 0}</span>
                    </Flex>
                    {document.embeddingStatus && (
                      <Flex justify="between">
                        <span className="text-xs text-gray-500">Embedding</span>
                        <Badge variant={document.embeddingStatus.status === 'completed' ? 'success' : 'warning'} size="sm">
                          {document.embeddingStatus.status}
                        </Badge>
                      </Flex>
                    )}
                  </Stack>
                </details>

                {document.processingError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-700 mb-2">⚠️ Processing Error</h4>
                    <p className="text-sm text-red-600">{document.processingError}</p>
                  </div>
                )}
              </Stack>
            </TabsContent>

            <TabsContent value="metadata" className="p-6">
              <Stack spacing="lg">
                {document.authors && document.authors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span>👥</span> Authors
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {document.authors.join(', ')}
                    </p>
                  </div>
                )}

                {document.abstract && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span>📝</span> Abstract
                    </h4>
                    <div className="relative">
                      <p className={`text-sm text-gray-700 leading-relaxed ${!showFullAbstract && document.abstract.length > 300 ? 'line-clamp-4' : ''}`}>
                        {document.abstract}
                      </p>
                      {document.abstract.length > 300 && (
                        <button
                          onClick={() => setShowFullAbstract(!showFullAbstract)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                        >
                          {showFullAbstract ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {document.keywords && document.keywords.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span>🏷️</span> Keywords
                    </h4>
                    <Flex gap="sm" wrap="wrap">
                      {document.keywords.map((keyword, index) => (
                        <Badge key={index} variant="default" size="sm">
                          {keyword}
                        </Badge>
                      ))}
                    </Flex>
                  </div>
                )}

                {/* Publication Details */}
                {(document.doi || document.journal || document.publicationYear) && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span>📚</span> Publication Details
                    </h4>
                    <Stack spacing="sm">
                      {document.journal && (
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">Journal</span>
                          <p className="text-sm text-gray-700">{document.journal}</p>
                        </div>
                      )}
                      {document.publicationYear && (
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">Year</span>
                          <p className="text-sm text-gray-700">{document.publicationYear}</p>
                        </div>
                      )}
                      {document.doi && (
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">DOI</span>
                          <p className="text-sm text-gray-700 font-mono">{document.doi}</p>
                        </div>
                      )}
                    </Stack>
                  </div>
                )}

                {!document.authors && !document.abstract && !document.keywords && !document.doi && !document.journal && !document.publicationYear && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-1">No Publication Metadata</p>
                    <p className="text-xs text-gray-500">Author, journal, and citation information was not extracted from this document</p>
                  </div>
                )}
              </Stack>
            </TabsContent>

            <TabsContent value="enrichment" className="p-6">
              {document.enrichment ? (
                <Stack spacing="lg">
                  {/* High Priority: Research Questions & Contributions */}
                  {document.enrichment.research_questions && document.enrichment.research_questions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span>❓</span> Research Questions
                      </h4>
                      <ul className="space-y-2 pl-4">
                        {document.enrichment.research_questions.map((question, index) => (
                          <li key={index} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                            <span className="text-blue-500 flex-shrink-0">•</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {document.enrichment.key_contributions && document.enrichment.key_contributions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span>⭐</span> Key Contributions
                      </h4>
                      <ul className="space-y-2 pl-4">
                        {document.enrichment.key_contributions.map((contribution, index) => (
                          <li key={index} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                            <span className="text-green-500 flex-shrink-0">•</span>
                            <span>{contribution}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {document.enrichment.methodology_summary && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span>🔬</span> Methodology
                      </h4>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">
                        {document.enrichment.methodology_summary}
                      </p>
                    </div>
                  )}

                  {/* Topics & Concepts */}
                  {(document.enrichment.key_concepts || document.enrichment.related_topics) && (
                    <div className="border-t pt-4">
                      {document.enrichment.key_concepts && document.enrichment.key_concepts.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span>💡</span> Key Concepts
                          </h4>
                          <Flex gap="sm" wrap="wrap">
                            {document.enrichment.key_concepts.map((concept, index) => (
                              <Badge key={index} variant="info" size="sm">
                                {concept}
                              </Badge>
                            ))}
                          </Flex>
                        </div>
                      )}

                      {document.enrichment.related_topics && document.enrichment.related_topics.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span>🔗</span> Related Topics
                          </h4>
                          <Flex gap="sm" wrap="wrap">
                            {document.enrichment.related_topics.map((topic, index) => (
                              <Badge key={index} variant="default" size="sm">
                                {topic}
                              </Badge>
                            ))}
                          </Flex>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Technical Terms - Collapsible */}
                  {document.enrichment.technical_terms && document.enrichment.technical_terms.length > 0 && (
                    <details className="border-t pt-4">
                      <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900 flex items-center gap-2">
                        <span>📖</span> Technical Terms ({document.enrichment.technical_terms.length})
                      </summary>
                      <Stack spacing="sm" className="mt-3">
                        {document.enrichment.technical_terms.slice(0, 5).map((item, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm font-semibold text-gray-900 mb-1">{item.term}</p>
                            <p className="text-sm text-gray-600">{item.definition}</p>
                          </div>
                        ))}
                      </Stack>
                    </details>
                  )}

                  {/* Future Work */}
                  {document.enrichment.future_work_suggestions && document.enrichment.future_work_suggestions.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span>🚀</span> Future Work
                      </h4>
                      <ul className="space-y-2 pl-4">
                        {document.enrichment.future_work_suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                            <span className="text-purple-500 flex-shrink-0">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Citation Impact - Highlighted */}
                  {document.enrichment.citation_impact_prediction && (
                    <div className="border-t pt-4">
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <span>📊</span> Citation Impact Prediction
                        </h4>
                        <Stack spacing="sm">
                          <Flex justify="between" align="center">
                            <span className="text-sm text-gray-600">Predicted Citations</span>
                            <span className="text-xl font-bold text-blue-600">
                              {document.enrichment.citation_impact_prediction.predicted_citations}
                            </span>
                          </Flex>
                          <Flex justify="between" align="center">
                            <span className="text-sm text-gray-600">Confidence</span>
                            <span className="text-sm font-semibold text-blue-700">
                              {(document.enrichment.citation_impact_prediction.confidence * 100).toFixed(0)}%
                            </span>
                          </Flex>
                          {document.enrichment.citation_impact_prediction.reasoning && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              <p className="text-sm text-gray-700 leading-relaxed italic">
                                {document.enrichment.citation_impact_prediction.reasoning}
                              </p>
                            </div>
                          )}
                        </Stack>
                      </div>
                    </div>
                  )}
                </Stack>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 font-medium mb-1">No AI Insights Yet</p>
                  <p className="text-xs text-gray-500">AI-generated insights have not been created for this document</p>
                </div>
              )}
            </TabsContent>

            {document.outline && Array.isArray(document.outline) && document.outline.length > 0 && (
              <TabsContent value="outline" className="p-6">
                <div className="space-y-1">
                  {document.outline.map((item, index) => {
                    const levelStyles = {
                      0: 'font-semibold text-gray-900 text-base py-3 border-b border-gray-100',
                      1: 'font-medium text-gray-800 text-sm py-2.5',
                      2: 'font-normal text-gray-700 text-sm py-2',
                      3: 'font-normal text-gray-600 text-sm py-1.5',
                    }
                    const levelStyle = levelStyles[item.level as keyof typeof levelStyles] || 'font-normal text-gray-600 text-sm py-1.5'

                    return (
                      <div
                        key={index}
                        className={`group hover:bg-gray-50 rounded-md px-3 -mx-3 transition-colors cursor-pointer ${levelStyle}`}
                        style={{ paddingLeft: `${12 + item.level * 16}px` }}
                      >
                        <Flex justify="between" align="center" gap="sm">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {item.level === 0 && <span className="text-blue-600 flex-shrink-0">📑</span>}
                            {item.level === 1 && <span className="text-gray-400 flex-shrink-0 text-xs">▸</span>}
                            {item.level >= 2 && <span className="text-gray-300 flex-shrink-0 text-xs">•</span>}
                            <span className="flex-1 break-words">{item.title}</span>
                          </div>
                          {item.page && (
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded flex-shrink-0 group-hover:bg-white transition-colors">
                              {item.page}
                            </span>
                          )}
                        </Flex>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
