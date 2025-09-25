'use client'

/**
 * Enhanced Dashboard Page
 * Main authenticated user dashboard with comprehensive features
 */

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { DocumentLibrary } from '@/components/user/DocumentLibrary'
import { DocumentLibraryIntegrated } from '@/components/user/DocumentLibraryIntegrated'
import { UserProfile } from '@/components/user/UserProfile'
import { UserSettings } from '@/components/user/UserSettings'
import { StreamingDemo } from '@/components/StreamingDemo'
import { FileUpload, FileUploadIntegrated, DragDropUpload, UploadQueue } from '@/components/upload'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Container, Grid, Stack, Flex } from '@/components/layout'
import { ErrorBoundary } from '@/components/error'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type TabType = 'overview' | 'documents' | 'upload' | 'profile' | 'settings' | 'demo'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const { addNotification, addDocument } = useApp()
  const router = useRouter()
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
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <Container size="xl">
            <Flex justify="between" align="center" className="h-16">
              <Flex align="center" gap="lg">
                <Link href="/" className="text-xl font-bold text-blue-600">
                  Lemma
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              </Flex>
              
              <Flex align="center" gap="md">
                <span className="text-sm text-gray-700">
                  Welcome, {user.user_metadata?.full_name || user.email}
                </span>
                
                <Flex align="center" gap="sm">
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
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </Flex>
              </Flex>
            </Flex>
          </Container>
        </nav>

        <Container size="xl" className="py-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap rounded-none ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </Button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <Stack spacing="lg">
              {/* Statistics */}
              <DashboardStats />
              
              {/* Recent Activity */}
              <RecentActivity />
              
              {/* Quick Actions */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Grid cols={1} responsive={{ md: 3 }} gap="md">
                    <Card
                      variant="outlined"
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setActiveTab('upload')}
                    >
                      <CardContent className="p-4">
                        <Flex align="center" gap="md">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">Upload Document</h4>
                            <p className="text-sm text-gray-500">Add a new PDF for analysis</p>
                          </div>
                        </Flex>
                      </CardContent>
                    </Card>
                    
                    <Card
                      variant="outlined"
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setActiveTab('demo')}
                    >
                      <CardContent className="p-4">
                        <Flex align="center" gap="md">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">Try Demo</h4>
                            <p className="text-sm text-gray-500">Test streaming analysis</p>
                          </div>
                        </Flex>
                      </CardContent>
                    </Card>
                    
                    <Card
                      variant="outlined"
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setActiveTab('documents')}
                    >
                      <CardContent className="p-4">
                        <Flex align="center" gap="md">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">View Library</h4>
                            <p className="text-sm text-gray-500">Browse your documents</p>
                          </div>
                        </Flex>
                      </CardContent>
                    </Card>
                  </Grid>
                </CardContent>
              </Card>
            </Stack>
          )}

          {activeTab === 'documents' && (
            <DocumentLibraryIntegrated
              onDocumentSelect={(doc) => router.push(`/document/${doc.id}`)}
              onDocumentDelete={(id) => console.log('Document deleted:', id)}
            />
          )}

          {activeTab === 'upload' && (
            <Stack spacing="lg">
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Upload Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-6">
                    Upload PDF documents for AI-powered analysis. Files are securely stored and processed automatically.
                  </p>
                </CardContent>
              </Card>

              <FileUploadIntegrated
                onUploadComplete={(document) => {
                  console.log('Document uploaded and processed:', document)
                  addDocument(document)
                  addNotification({
                    type: 'success',
                    title: 'Document Processed',
                    message: `${document.title} is ready for analysis!`
                  })
                }}
                onUploadError={(file, error) => {
                  console.error('Upload failed:', file.name, error)
                  addNotification({
                    type: 'error',
                    title: 'Upload Failed',
                    message: `Failed to upload ${file.name}: ${error}`
                  })
                }}
                onUploadStart={(file) => {
                  addNotification({
                    type: 'info',
                    title: 'Upload Started',
                    message: `Uploading ${file.name}...`
                  })
                }}
                maxFileSize={50 * 1024 * 1024} // 50MB
                allowMultiple={true}
                acceptedTypes={['.pdf', 'application/pdf']}
              />
            </Stack>
          )}

          {activeTab === 'profile' && (
            <UserProfile onUpdate={() => console.log('Profile updated')} />
          )}

          {activeTab === 'settings' && (
            <UserSettings onUpdate={() => console.log('Settings updated')} />
          )}

          {activeTab === 'demo' && (
            <Stack spacing="lg">
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Streaming Analysis Demo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-6">
                    Test the real-time streaming analysis pipeline with hardcoded responses.
                    This demonstrates the end-to-end streaming functionality.
                  </p>
                </CardContent>
              </Card>
              <StreamingDemo />
            </Stack>
          )}
        </Container>
      </div>
    </ErrorBoundary>
  )
}