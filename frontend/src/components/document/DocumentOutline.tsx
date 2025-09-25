'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'

interface OutlineItem {
  id: string
  title: string
  level: number
  page: number
  children?: OutlineItem[]
  anchor?: string
}

interface DocumentOutlineProps {
  outline: OutlineItem[]
  currentSection?: string
  onSectionSelect?: (item: OutlineItem) => void
  searchable?: boolean
  collapsible?: boolean
  showPageNumbers?: boolean
  className?: string
}

const DocumentOutline: React.FC<DocumentOutlineProps> = ({
  outline,
  currentSection,
  onSectionSelect,
  searchable = true,
  collapsible = true,
  showPageNumbers = true,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Filter outline based on search term
  const filteredOutline = React.useMemo(() => {
    if (!searchTerm) return outline

    const filterItems = (items: OutlineItem[]): OutlineItem[] => {
      return items.reduce((filtered: OutlineItem[], item) => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase())
        const childMatches = item.children ? filterItems(item.children) : []
        
        if (matchesSearch || childMatches.length > 0) {
          filtered.push({
            ...item,
            children: childMatches.length > 0 ? childMatches : item.children
          })
        }
        
        return filtered
      }, [])
    }

    return filterItems(outline)
  }, [outline, searchTerm])

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (expandedItems.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const expandAll = () => {
    const allIds = new Set<string>()
    const addIds = (items: OutlineItem[]) => {
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          allIds.add(item.id)
          addIds(item.children)
        }
      })
    }
    addIds(outline)
    setExpandedItems(allIds)
  }

  const collapseAll = () => {
    setExpandedItems(new Set())
  }

  const renderOutlineItem = (item: OutlineItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const isCurrent = currentSection === item.id
    const indentClass = `ml-${Math.min(depth * 4, 16)}`

    return (
      <div key={item.id}>
        <div
          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
            isCurrent 
              ? 'bg-blue-100 text-blue-900' 
              : 'hover:bg-gray-50'
          } ${indentClass}`}
          onClick={() => onSectionSelect?.(item)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpanded(item.id)
                }}
                className="p-0 h-auto min-w-0 w-4"
              >
                <svg 
                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            )}
            {!hasChildren && <div className="w-4" />}
            
            <span 
              className={`text-sm truncate ${
                item.level === 1 ? 'font-semibold' : 
                item.level === 2 ? 'font-medium' : 
                'font-normal'
              }`}
              title={item.title}
            >
              {item.title}
            </span>
          </div>

          {showPageNumbers && (
            <Badge variant="default" size="sm">
              p. {item.page}
            </Badge>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-2">
            {item.children!.map(child => renderOutlineItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (outline.length === 0) {
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
            This document doesn't have a table of contents or the outline hasn't been processed yet.
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
          
          <Flex gap="xs">
            {filteredOutline.length > 0 && (
              <>
                <Button size="sm" variant="ghost" onClick={expandAll}>
                  Expand All
                </Button>
                <Button size="sm" variant="ghost" onClick={collapseAll}>
                  Collapse All
                </Button>
              </>
            )}
            
            {collapsible && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </Button>
            )}
          </Flex>
        </Flex>

        {searchable && !isCollapsed && (
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
        )}
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-2">
          {filteredOutline.length > 0 ? (
            <Stack spacing="xs" className="max-h-96 overflow-y-auto">
              {filteredOutline.map(item => renderOutlineItem(item))}
            </Stack>
          ) : searchTerm ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">
                No sections found matching "{searchTerm}"
              </p>
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  )
}

export default DocumentOutline