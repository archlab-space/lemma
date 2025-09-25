'use client'

/**
 * Notification Center Component
 * Displays app-wide notifications with different types and auto-dismiss
 */

import React, { useEffect, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent, Button } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'

interface NotificationItemProps {
  notification: {
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    timestamp: Date
    read: boolean
  }
  onDismiss: (id: string) => void
  onMarkRead: (id: string) => void
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onDismiss, 
  onMarkRead 
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const getTypeStyles = () => {
    const baseStyles = "border-l-4 transition-all duration-300 ease-in-out transform"
    const visibleStyles = isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
    
    switch (notification.type) {
      case 'success':
        return `${baseStyles} ${visibleStyles} border-l-green-500 bg-green-50`
      case 'warning':
        return `${baseStyles} ${visibleStyles} border-l-yellow-500 bg-yellow-50`
      case 'error':
        return `${baseStyles} ${visibleStyles} border-l-red-500 bg-red-50`
      case 'info':
      default:
        return `${baseStyles} ${visibleStyles} border-l-blue-500 bg-blue-50`
    }
  }

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'info':
      default:
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss(notification.id), 300)
  }

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id)
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Card 
      variant="outlined" 
      className={getTypeStyles()}
      onClick={handleClick}
    >
      <CardContent className="p-4 cursor-pointer">
        <Flex gap="sm" align="start">
          <div className="flex-shrink-0 mt-0.5">
            {getTypeIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <Flex justify="between" align="start" className="mb-1">
              <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                {notification.title}
              </h4>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatTime(notification.timestamp)}
                </span>
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </div>
            </Flex>
            
            <p className={`text-sm ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
              {notification.message}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDismiss()
            }}
            className="p-1 ml-2 hover:bg-gray-100"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </Flex>
      </CardContent>
    </Card>
  )
}

interface NotificationCenterProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  maxNotifications?: number
  className?: string
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  position = 'top-right',
  maxNotifications = 5,
  className = ''
}) => {
  const { state, removeNotification, markNotificationRead, clearAllNotifications } = useApp()
  const { notifications } = state

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-right':
      default:
        return 'top-4 right-4'
    }
  }

  const visibleNotifications = notifications.slice(0, maxNotifications)

  if (visibleNotifications.length === 0) {
    return null
  }

  return (
    <div className={`fixed z-50 w-96 max-w-sm ${getPositionClasses()} ${className}`}>
      <Stack spacing="sm">
        {/* Clear All Button */}
        {notifications.length > 1 && (
          <Flex justify="end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear All ({notifications.length})
            </Button>
          </Flex>
        )}

        {/* Notifications */}
        {visibleNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={removeNotification}
            onMarkRead={markNotificationRead}
          />
        ))}

        {/* More notifications indicator */}
        {notifications.length > maxNotifications && (
          <Card variant="outlined" className="bg-gray-50">
            <CardContent className="p-2 text-center">
              <span className="text-xs text-gray-500">
                {notifications.length - maxNotifications} more notification{notifications.length - maxNotifications !== 1 ? 's' : ''}
              </span>
            </CardContent>
          </Card>
        )}
      </Stack>
    </div>
  )
}

export default NotificationCenter