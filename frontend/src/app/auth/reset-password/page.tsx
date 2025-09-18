'use client'

/**
 * Password Reset Page
 * Handles password reset token validation and form display
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PasswordResetForm } from '@/components/auth/PasswordResetForm'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'request' | 'reset'>('request')
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkResetToken = async () => {
      // Check if we have reset token parameters
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      const type = searchParams.get('type')

      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          // Set the session with the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            setError('Invalid or expired reset link')
            setMode('request')
          } else {
            setMode('reset')
            setToken(accessToken)
          }
        } catch (err) {
          setError('Failed to validate reset link')
          setMode('request')
        }
      } else {
        setMode('request')
      }
      
      setLoading(false)
    }

    checkResetToken()
  }, [searchParams])

  const handleBack = () => {
    router.push('/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Lemma</h1>
          <p className="text-gray-600">AI-powered academic paper analysis</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <PasswordResetForm mode={mode} token={token || undefined} onBack={handleBack} />
      </div>
    </div>
  )
}