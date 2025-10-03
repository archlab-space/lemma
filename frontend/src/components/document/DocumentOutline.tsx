'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import type { DocumentOutlineItem } from '@/lib/api/types'

interface DocumentOutlineProps {
  outline?: DocumentOutlineItem[]
  className?: string
}

const DocumentOutline: React.FC<DocumentOutlineProps> = ({
  outline = [],
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([1]))

  // Parse outline if it's a string (JSONB from API might be serialized)
  const parsedOutline = React.useMemo<DocumentOutlineItem[]>(() => {
    if (!outline) return []
    if (typeof outline === 'string') {
      try {
        return JSON.parse(outline) as DocumentOutlineItem[]
      } catch {
        return []
      }
    }
    if (Array.isArray(outline)) return outline
    return []
  }, [outline])

  // Filter outline based on search term
  const filteredOutline = React.useMemo(() => {
    if (!searchTerm) return parsedOutline

    return parsedOutline.filter((item: DocumentOutlineItem) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [parsedOutline, searchTerm])

  const expandAll = () => {
    const allLevels = new Set<number>(parsedOutline.map((item: DocumentOutlineItem) => item.level))
    setExpandedLevels(allLevels)
  }

  const collapseAll = () => {
    setExpandedLevels(new Set([1]))
  }

  const getIndentStyle = (level: number) => {
    if (level <= 1) return {}
    const indent = Math.min((level - 1) * 16, 48) // 16px = 1rem, max 48px
    return { marginLeft: `${indent}px` }
  }

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'introduction': return 'text-blue-600'
      case 'methods': return 'text-purple-600'
      case 'results': return 'text-green-600'
      case 'discussion': return 'text-orange-600'
      case 'conclusion': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (!parsedOutline || parsedOutline.length === 0) {
    return (
      <Card variant="outlined" className={className}>
        <CardContent className="p-6 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No Outline Available</h3>
          <p className="text-sm text-gray-500">
            This document doesn&apos;t have a table of contents or the outline hasn&apos;t been processed yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="outlined" className={className}>
      <CardHeader className="pb-2">
        <Flex justify="between" align="center">
          <CardTitle className="text-base">Document Outline</CardTitle>

          <Flex gap="sm">
            <Button size="sm" variant="ghost" onClick={expandAll}>
              Expand All
            </Button>
            <Button size="sm" variant="ghost" onClick={collapseAll}>
              Collapse All
            </Button>
          </Flex>
        </Flex>

        <Input
          placeholder="Search sections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          className="mt-3"
        />
      </CardHeader>

      <CardContent className="pt-2">
        {filteredOutline.length > 0 ? (
          <Stack spacing="xs" className="max-h-96 overflow-y-auto">
            {filteredOutline.map((item: DocumentOutlineItem, index: number) => {
              const shouldShow = item.level === 1 || expandedLevels.has(item.level - 1)
              const indentStyle = getIndentStyle(item.level)

              if (!shouldShow) return null

              return (
                <div
                  key={`${item.title}-${index}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors"
                  style={indentStyle}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.level > 1 && (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      </div>
                    )}

                    <span
                      className={`text-sm truncate ${
                        item.level === 1 ? 'font-semibold' :
                        item.level === 2 ? 'font-medium' :
                        'font-normal'
                      } ${getTypeColor(item.type)}`}
                      title={item.title}
                    >
                      {item.title}
                    </span>
                  </div>

                  {item.page && (
                    <Badge variant="default" size="sm">
                      p. {item.page}
                    </Badge>
                  )}
                </div>
              )
            })}
          </Stack>
        ) : searchTerm ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">
              No sections found matching &quot;{searchTerm}&quot;
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default DocumentOutline
