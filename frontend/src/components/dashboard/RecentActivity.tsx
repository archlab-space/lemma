'use client'

/**
 * Recent Activity Component
 * Shows user's recent document interactions and activities
 */

import React from 'react'

interface ActivityItem {
  id: string
  type: 'document_uploaded' | 'question_asked' | 'document_processed' | 'session_started'
  title: string
  description: string
  timestamp: Date
  documentName?: string
  status?: 'completed' | 'processing' | 'failed'
}

interface RecentActivityProps {
  activities?: ActivityItem[]
  maxItems?: number
}

export function RecentActivity({ activities, maxItems = 5 }: RecentActivityProps) {
  // Demo data
  const defaultActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'document_uploaded',
      title: 'New document uploaded',
      description: 'Machine Learning Fundamentals.pdf',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      documentName: 'Machine Learning Fundamentals.pdf',
      status: 'completed',
    },
    {
      id: '2',
      type: 'question_asked',
      title: 'Question asked',
      description: 'What are the main types of machine learning algorithms?',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      documentName: 'Machine Learning Fundamentals.pdf',
    },
    {
      id: '3',
      type: 'document_processed',
      title: 'Document processing completed',
      description: 'Neural Networks in Python.pdf',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      documentName: 'Neural Networks in Python.pdf',
      status: 'completed',
    },
    {
      id: '4',
      type: 'session_started',
      title: 'New chat session',
      description: 'Started analysis of Deep Learning research',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: '5',
      type: 'document_uploaded',
      title: 'Document upload failed',
      description: 'Large_Dataset_Analysis.pdf',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      documentName: 'Large_Dataset_Analysis.pdf',
      status: 'failed',
    },
  ]

  const userActivities = activities || defaultActivities
  const displayActivities = userActivities.slice(0, maxItems)

  const getActivityIcon = (type: ActivityItem['type'], status?: ActivityItem['status']) => {
    const iconClass = "w-5 h-5"
    
    switch (type) {
      case 'document_uploaded':
        if (status === 'failed') {
          return (
            <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        }
        return (
          <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        )
      case 'question_asked':
        return (
          <svg className={`${iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'document_processed':
        return (
          <svg className={`${iconClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'session_started':
        return (
          <svg className={`${iconClass} text-orange-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      default:
        return (
          <svg className={`${iconClass} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getStatusBadge = (status?: ActivityItem['status']) => {
    if (!status) return null

    const badges = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}>
        {status}
      </span>
    )
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return timestamp.toLocaleDateString()
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        <p className="text-sm text-gray-500">Your latest interactions with Lemma</p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {displayActivities.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">No recent activity</p>
            <p className="text-sm text-gray-400 mt-1">Upload a document to get started</p>
          </div>
        ) : (
          displayActivities.map((activity) => (
            <div key={activity.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(activity.status)}
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {activity.description}
                  </p>
                  {activity.documentName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Document: {activity.documentName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {displayActivities.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
            View all activity
          </button>
        </div>
      )}
    </div>
  )
}