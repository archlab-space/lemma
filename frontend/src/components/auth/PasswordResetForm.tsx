'use client'

/**
 * Password Reset Form Component
 * Handles forgot password and reset password flows
 */

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface PasswordResetFormProps {
  mode: 'request' | 'reset'
  token?: string
  onBack?: () => void
}

export function PasswordResetForm({ mode, token, onBack }: PasswordResetFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { resetPassword } = useAuth()

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await resetPassword(email)
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Implementation would depend on your specific reset flow
      // This is a placeholder for the actual password update logic
      setSuccess(true)
    } catch (err) {
      setError('Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-green-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {mode === 'request' ? 'Check Your Email' : 'Password Reset Complete'}
          </h2>
          <p className="text-gray-600 mb-6">
            {mode === 'request'
              ? 'We\'ve sent a password reset link to your email address.'
              : 'Your password has been successfully reset. You can now sign in with your new password.'
            }
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === 'request' ? 'Reset Password' : 'Set New Password'}
        </h2>
        <p className="text-gray-600 mt-2">
          {mode === 'request'
            ? 'Enter your email address and we\'ll send you a reset link'
            : 'Enter your new password below'
          }
        </p>
      </div>

      <form onSubmit={mode === 'request' ? handleRequestReset : handlePasswordReset} className="space-y-4">
        {mode === 'request' ? (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm new password"
              />
            </div>
          </>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : mode === 'request' ? 'Send Reset Link' : 'Reset Password'}
        </button>
      </form>

      {onBack && (
        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to Sign In
          </button>
        </div>
      )}
    </div>
  )
}