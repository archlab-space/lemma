'use client'

/**
 * Dashboard Statistics Component
 * Displays user statistics and usage metrics
 */

import React from 'react'

interface DashboardStatsProps {
  stats?: {
    documentsProcessed: number
    questionsAsked: number
    hoursUsed: number
    storageUsed: number
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  // Default stats for demo
  const defaultStats = {
    documentsProcessed: 12,
    questionsAsked: 47,
    hoursUsed: 8.5,
    storageUsed: 245, // MB
  }

  const userStats = stats || defaultStats

  const formatStorage = (mb: number) => {
    if (mb < 1024) return `${mb} MB`
    return `${(mb / 1024).toFixed(1)} GB`
  }

  const statItems = [
    {
      name: 'Documents Processed',
      value: userStats.documentsProcessed.toLocaleString(),
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      change: '+2 this week',
      changeType: 'positive' as const,
    },
    {
      name: 'Questions Asked',
      value: userStats.questionsAsked.toLocaleString(),
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      change: '+15 this week',
      changeType: 'positive' as const,
    },
    {
      name: 'Hours Used',
      value: userStats.hoursUsed.toFixed(1),
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      change: '+2.5h this week',
      changeType: 'positive' as const,
    },
    {
      name: 'Storage Used',
      value: formatStorage(userStats.storageUsed),
      icon: (
        <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      change: `${((userStats.storageUsed / 1024) * 100).toFixed(1)}% of 1GB`,
      changeType: 'neutral' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item) => (
        <div key={item.name} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {item.icon}
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">{item.name}</p>
              <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-sm ${
              item.changeType === 'positive' 
                ? 'text-green-600' 
                : item.changeType === 'negative' 
                ? 'text-red-600' 
                : 'text-gray-500'
            }`}>
              {item.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}