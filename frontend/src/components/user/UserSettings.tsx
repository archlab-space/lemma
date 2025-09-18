'use client'

/**
 * User Settings Component
 * Handles user preferences and account settings
 */

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { SessionManager } from './SessionManager'

interface UserSettingsProps {
  onUpdate?: () => void
}

interface UserPreferences {
  notifications: {
    email: boolean
    processing: boolean
    security: boolean
  }
  privacy: {
    shareUsage: boolean
    improveModel: boolean
  }
  interface: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
  }
}

export function UserSettings({ onUpdate }: UserSettingsProps) {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: {
      email: true,
      processing: true,
      security: true,
    },
    privacy: {
      shareUsage: false,
      improveModel: false,
    },
    interface: {
      theme: 'system',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })

  const handleSaveSettings = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // TODO: Implement settings save API call
      // const { error } = await updateUserSettings(preferences)
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess('Settings updated successfully')
      onUpdate?.()
    } catch (err) {
      setError('Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    const confirmText = prompt('Please type "DELETE" to confirm account deletion:')
    if (confirmText !== 'DELETE') {
      return
    }

    setLoading(true)
    try {
      // TODO: Implement account deletion API call
      // const { error } = await deleteUserAccount()
      
      alert('Account deletion requested. You will receive an email with further instructions.')
      await signOut()
    } catch (err) {
      setError('Failed to process account deletion request')
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = (category: keyof UserPreferences, key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }))
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Notification Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          <p className="text-sm text-gray-500">Manage how you receive notifications</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Email Notifications</label>
              <p className="text-sm text-gray-500">Receive updates via email</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications.email}
              onChange={(e) => updatePreference('notifications', 'email', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Processing Notifications</label>
              <p className="text-sm text-gray-500">Get notified when document processing completes</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications.processing}
              onChange={(e) => updatePreference('notifications', 'processing', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Security Alerts</label>
              <p className="text-sm text-gray-500">Important security and account notifications</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications.security}
              onChange={(e) => updatePreference('notifications', 'security', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Privacy</h3>
          <p className="text-sm text-gray-500">Control how your data is used</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Share Usage Analytics</label>
              <p className="text-sm text-gray-500">Help improve Lemma by sharing anonymous usage data</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.privacy.shareUsage}
              onChange={(e) => updatePreference('privacy', 'shareUsage', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Help Improve AI Models</label>
              <p className="text-sm text-gray-500">Allow your interactions to help train better AI responses</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.privacy.improveModel}
              onChange={(e) => updatePreference('privacy', 'improveModel', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Interface Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Interface</h3>
          <p className="text-sm text-gray-500">Customize your Lemma experience</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Theme</label>
            <select
              value={preferences.interface.theme}
              onChange={(e) => updatePreference('interface', 'theme', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Language</label>
            <select
              value={preferences.interface.language}
              onChange={(e) => updatePreference('interface', 'language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Timezone</label>
            <input
              type="text"
              value={preferences.interface.timezone}
              onChange={(e) => updatePreference('interface', 'timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., America/New_York"
            />
          </div>
        </div>
      </div>

      {/* Session Management */}
      <SessionManager onSessionRevoked={() => console.log('Session revoked')} />

      {/* Account Management */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Account Management</h3>
          <p className="text-sm text-gray-500">Manage your account and data</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Export Data</label>
              <p className="text-sm text-gray-500">Download all your data in JSON format</p>
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              Export
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-red-900">Delete Account</label>
              <p className="text-sm text-red-500">Permanently delete your account and all data</p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}