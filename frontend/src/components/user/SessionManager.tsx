'use client'

/**
 * Session Manager Component
 * Handles user session management and active sessions display
 */

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface UserSession {
  id: string
  deviceName: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  browser: string
  location: string
  ipAddress: string
  lastActive: Date
  isCurrent: boolean
}

interface SessionManagerProps {
  onSessionRevoked?: (sessionId: string) => void
}

export function SessionManager({ onSessionRevoked }: SessionManagerProps) {
  const { user, signOut } = useAuth()
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Demo sessions data
  useEffect(() => {
    // Simulate fetching sessions
    const demoSessions: UserSession[] = [
      {
        id: '1',
        deviceName: 'MacBook Pro',
        deviceType: 'desktop',
        browser: 'Chrome 119',
        location: 'San Francisco, CA',
        ipAddress: '192.168.1.100',
        lastActive: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        isCurrent: true,
      },
      {
        id: '2',
        deviceName: 'iPhone 14 Pro',
        deviceType: 'mobile',
        browser: 'Safari Mobile',
        location: 'San Francisco, CA',
        ipAddress: '192.168.1.105',
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isCurrent: false,
      },
      {
        id: '3',
        deviceName: 'Windows Desktop',
        deviceType: 'desktop',
        browser: 'Edge 119',
        location: 'New York, NY',
        ipAddress: '10.0.0.50',
        lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        isCurrent: false,
      },
    ]
    setSessions(demoSessions)
  }, [])

  const getDeviceIcon = (deviceType: UserSession['deviceType']) => {
    switch (deviceType) {
      case 'desktop':
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'mobile':
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      case 'tablet':
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      default:
        return null
    }
  }

  const formatLastActive = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) {
      return 'Active now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else {
      return `${diffDays}d ago`
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    setLoading(true)
    setError(null)

    try {
      // TODO: Implement session revocation API call
      // const { error } = await revokeUserSession(sessionId)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      onSessionRevoked?.(sessionId)
    } catch (err) {
      setError('Failed to revoke session')
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeAllOtherSessions = async () => {
    if (!confirm('Are you sure you want to sign out of all other devices? This cannot be undone.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // TODO: Implement revoke all other sessions API call
      // const { error } = await revokeAllOtherSessions()
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSessions(prev => prev.filter(s => s.isCurrent))
    } catch (err) {
      setError('Failed to revoke other sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOutEverywhere = async () => {
    if (!confirm('Are you sure you want to sign out of all devices including this one? You will need to sign in again.')) {
      return
    }

    try {
      await signOut()
    } catch (err) {
      setError('Failed to sign out')
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
        <p className="text-sm text-gray-500">Manage your active sessions across devices</p>
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {sessions.map((session) => (
          <div key={session.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getDeviceIcon(session.deviceType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">
                      {session.deviceName}
                    </p>
                    {session.isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {session.browser} • {session.location}
                  </p>
                  <p className="text-xs text-gray-400">
                    IP: {session.ipAddress} • {formatLastActive(session.lastActive)}
                  </p>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={loading}
                    className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Session Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleRevokeAllOtherSessions}
            disabled={loading || sessions.filter(s => !s.isCurrent).length === 0}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Revoking...' : 'Revoke All Other Sessions'}
          </button>
          
          <button
            onClick={handleSignOutEverywhere}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            Sign Out Everywhere
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Use &ldquo;Revoke All Other Sessions&rdquo; if you suspect your account has been compromised.
          Use &ldquo;Sign Out Everywhere&rdquo; to sign out of all devices including this one.
        </p>
      </div>
    </div>
  )
}