'use client'

/**
 * User Profile Component
 * Displays and allows editing of user profile information
 */

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface UserProfileProps {
  onUpdate?: () => void
}

export function UserProfile({ onUpdate }: UserProfileProps) {
  const { user } = useAuth()
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
      // TODO: Implement profile update API call
      // const { error } = await updateUserProfile(profileData)
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess('Profile updated successfully')
      setIsEditing(false)
      onUpdate?.()
    } catch (err) {
      setError('Failed to update profile')
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
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
        <p className="text-sm text-gray-500">Manage your account details and preferences</p>
      </div>

      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <div className="space-y-6">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {profileData.full_name || 'Not provided'}
              </p>
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
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {isOAuth ? `${provider} OAuth` : 'Email Account'}
              </span>
              {providers.length > 1 && (
                <span className="text-xs text-gray-500">
                  +{providers.length - 1} other method{providers.length > 2 ? 's' : ''}
                </span>
              )}
            </div>
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
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  )
}