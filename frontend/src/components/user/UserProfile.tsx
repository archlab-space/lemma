'use client'

/**
 * User Profile Component
 * Displays and allows editing of user profile information
 */

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'
import { Button, Input, Badge, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Stack, Flex } from '@/components/layout'
import { ErrorMessage } from '@/components/error'

interface UserProfileProps {
  onUpdate?: () => void
}

export function UserProfile({ onUpdate }: UserProfileProps) {
  const { user } = useAuth()
  const { updateUserProfile, addNotification } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [profileData, setProfileData] = useState({
    full_name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    avatar_url: user?.user_metadata?.avatar_url || '',
  })

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      await updateUserProfile({
        fullName: profileData.full_name,
      })
      
      setSuccess('Profile updated successfully')
      setIsEditing(false)
      onUpdate?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setProfileData({
      full_name: user?.user_metadata?.full_name || '',
      email: user?.email || '',
      avatar_url: user?.user_metadata?.avatar_url || '',
    })
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getProviderInfo = () => {
    const provider = user?.app_metadata?.provider || user?.user_metadata?.provider
    const providers = user?.app_metadata?.providers || []
    
    return {
      provider,
      providers,
      isOAuth: provider && provider !== 'email'
    }
  }

  const { provider, providers, isOAuth } = getProviderInfo()

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <p className="text-sm text-gray-500">Manage your account details and preferences</p>
      </CardHeader>

      <CardContent>
        <Stack spacing="md">
          {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
          
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <Stack spacing="lg">
          {/* Avatar Section */}
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              {profileData.avatar_url ? (
                <img
                  className="h-16 w-16 rounded-full object-cover"
                  src={profileData.avatar_url}
                  alt="Profile"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xl font-medium text-white">
                    {getInitials(profileData.full_name || profileData.email)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Profile Photo</h4>
              <p className="text-sm text-gray-500">
                {isOAuth ? 'Managed by your OAuth provider' : 'Update your profile photo'}
              </p>
              {!isOAuth && isEditing && (
                <button className="mt-2 text-sm text-blue-600 hover:text-blue-500">
                  Change photo
                </button>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div>
            {isEditing ? (
              <Input
                label="Full Name"
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter your full name"
              />
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <p className="text-sm text-gray-900">
                  {profileData.full_name || 'Not provided'}
                </p>
              </>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <p className="text-sm text-gray-900">{profileData.email}</p>
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <Flex gap="sm" align="center">
              <Badge variant="info">
                {isOAuth ? `${provider} OAuth` : 'Email Account'}
              </Badge>
              {providers.length > 1 && (
                <span className="text-xs text-gray-500">
                  +{providers.length - 1} other method{providers.length > 2 ? 's' : ''}
                </span>
              )}
            </Flex>
          </div>

          {/* Account Created */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Since
            </label>
            <p className="text-sm text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
          </Stack>

          {/* Action Buttons */}
          <Flex justify="end" gap="md">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={loading}
                  loading={loading}
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </Flex>
        </Stack>
      </CardContent>
    </Card>
  )
}