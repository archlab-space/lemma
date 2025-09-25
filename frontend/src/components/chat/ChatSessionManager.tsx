'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'

interface ChatSession {
  id: string
  title: string
  documentId: string
  documentName: string
  messageCount: number
  lastActivity: Date
  createdAt: Date
  isActive?: boolean
}

interface ChatSessionManagerProps {
  sessions: ChatSession[]
  currentSessionId?: string
  onSessionSelect?: (sessionId: string) => void
  onSessionCreate?: (documentId: string) => void
  onSessionDelete?: (sessionId: string) => void
  onSessionRename?: (sessionId: string, newTitle: string) => void
  maxSessions?: number
  className?: string
}

const ChatSessionManager: React.FC<ChatSessionManagerProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  onSessionRename,
  maxSessions = 50,
  className = '',
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showAll, setShowAll] = useState(false)

  const sortedSessions = [...sessions].sort(
    (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
  )

  const visibleSessions = showAll ? sortedSessions : sortedSessions.slice(0, 10)

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

  const handleStartEdit = (session: ChatSession) => {
    setEditingSessionId(session.id)
    setEditTitle(session.title)
  }

  const handleSaveEdit = () => {
    if (editingSessionId && editTitle.trim() && onSessionRename) {
      onSessionRename(editingSessionId, editTitle.trim())
    }
    setEditingSessionId(null)
    setEditTitle('')
  }

  const handleCancelEdit = () => {
    setEditingSessionId(null)
    setEditTitle('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <Card variant="outlined" className={className}>
      <CardHeader>
        <Flex justify="between" align="center">
          <CardTitle className="text-base">Chat Sessions</CardTitle>
          <Badge variant="default" size="sm">
            {sessions.length}{maxSessions && `/${maxSessions}`}
          </Badge>
        </Flex>
      </CardHeader>

      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Chat Sessions</h3>
            <p className="text-gray-500 mb-4">
              Start a conversation with a document to create your first chat session.
            </p>
          </div>
        ) : (
          <Stack spacing="sm">
            {visibleSessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  session.id === currentSessionId
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onSessionSelect?.(session.id)}
              >
                <Stack spacing="sm">
                  {/* Session Header */}
                  <Flex justify="between" align="start">
                    <div className="flex-1 min-w-0">
                      {editingSessionId === session.id ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={handleKeyPress}
                          onBlur={handleSaveEdit}
                          autoFocus
                          className="text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h4
                          className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartEdit(session)
                          }}
                          title="Click to rename"
                        >
                          {session.title}
                        </h4>
                      )}
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {session.documentName}
                      </p>
                    </div>

                    <Flex gap="xs" align="center">
                      {session.id === currentSessionId && (
                        <Badge variant="success" size="sm">
                          Active
                        </Badge>
                      )}
                      
                      {onSessionDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSessionDelete(session.id)
                          }}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      )}
                    </Flex>
                  </Flex>

                  {/* Session Info */}
                  <Flex justify="between" align="center" className="text-xs text-gray-500">
                    <span>
                      {session.messageCount} message{session.messageCount !== 1 ? 's' : ''}
                    </span>
                    <span>{formatRelativeTime(session.lastActivity)}</span>
                  </Flex>
                </Stack>
              </div>
            ))}

            {sessions.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="self-center"
              >
                {showAll 
                  ? 'Show Less' 
                  : `Show ${sessions.length - 10} More Sessions`
                }
              </Button>
            )}
          </Stack>
        )}

        {/* Session limits warning */}
        {maxSessions && sessions.length >= maxSessions * 0.9 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              You're approaching the session limit ({sessions.length}/{maxSessions}). 
              Consider deleting old sessions to make room for new ones.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ChatSessionManager