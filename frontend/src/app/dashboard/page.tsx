'use client'

/**
 * Enhanced Dashboard Page
 * Main authenticated user dashboard with comprehensive features
 */

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { DocumentLibrary } from '@/components/user/DocumentLibrary'
import { UserProfile } from '@/components/user/UserProfile'
import { UserSettings } from '@/components/user/UserSettings'
import { StreamingDemo } from '@/components/StreamingDemo'
import { FileUpload } from '@/components/upload/FileUpload'
import Link from 'next/link'

type TabType = 'overview' | 'documents' | 'upload' | 'profile' | 'settings' | 'demo'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const handleSignOut = async () => {
    await signOut()
  }

  // Middleware ensures user exists, show loading only if auth context is still loading
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'documents', name: 'Documents', icon: '📄' },
    { id: 'upload', name: 'Upload', icon: '📤' },
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
    { id: 'demo', name: 'Demo', icon: '🚀' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600 mr-8">
                Lemma
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.user_metadata?.full_name || user.email}
              </span>
              
              {/* User Avatar */}
              <div className="flex items-center space-x-3">
                {user.user_metadata?.avatar_url ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {getInitials(user.email)}
                    </span>
                  </div>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Statistics */}
              <DashboardStats />
              
              {/* Recent Activity */}
              <RecentActivity />
              
              {/* Quick Actions */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Upload Document</h4>
                        <p className="text-sm text-gray-500">Add a new PDF for analysis</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('demo')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Try Demo</h4>
                        <p className="text-sm text-gray-500">Test streaming analysis</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">View Library</h4>
                        <p className="text-sm text-gray-500">Browse your documents</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <DocumentLibrary
              onDocumentSelect={(doc) => console.log('Selected document:', doc)}
              onDocumentDelete={(id) => console.log('Delete document:', id)}
            />
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Documents</h3>
                <p className="text-gray-600 mb-6">
                  Upload PDF documents for AI-powered analysis. Files are securely stored and processed automatically.
                </p>
              </div>
              <FileUpload
                onUploadComplete={(file) => {
                  console.log('Upload completed:', file)
                  // Could trigger a refresh of the documents list
                }}
                onUploadError={(file, error) => {
                  console.error('Upload error:', error)
                }}
                maxFileSize={50 * 1024 * 1024} // 50MB
                allowMultiple={true}
              />
            </div>
          )}

          {activeTab === 'profile' && (
            <UserProfile onUpdate={() => console.log('Profile updated')} />
          )}

          {activeTab === 'settings' && (
            <UserSettings onUpdate={() => console.log('Settings updated')} />
          )}

          {activeTab === 'demo' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Streaming Analysis Demo</h3>
                <p className="text-gray-600 mb-6">
                  Test the real-time streaming analysis pipeline with hardcoded responses.
                  This demonstrates the end-to-end streaming functionality.
                </p>
              </div>
              <StreamingDemo />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}