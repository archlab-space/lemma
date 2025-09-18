'use client'

/**
 * Authentication Context for Lemma
 * Provides auth state and methods throughout the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, type User, type AuthSession } from '@/lib/supabase'
import type { Session, AuthError } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error?: AuthError | null }>
  signInWithProvider: (provider: 'google' | 'github') => Promise<{ error?: AuthError | null }>
  signOut: () => Promise<{ error?: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error?: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting initial session:', error)
        } else {
          console.log('✅ Initial session loaded:', { user: session?.user?.email, hasSession: !!session })
          setSession(session)
          setUser(session?.user as User || null)
        }
      } catch (err) {
        console.error('❌ Unexpected error getting session:', err)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email)
        
        setSession(session)
        setUser(session?.user as User || null)
        setLoading(false)

        // Handle different auth events
        if (event === 'SIGNED_IN') {
          console.log('✅ User signed in:', session?.user?.email)
          // Force a page refresh to update middleware
          setTimeout(() => window.location.reload(), 100)
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out')
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed for:', session?.user?.email)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting sign in with:', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log('🔐 Sign in result:', { user: data?.user?.email, session: !!data?.session, error })
    
    // Debug: Check cookies after login
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';').filter(c => c.includes('supabase'))
      console.log('🍪 Cookies after login:', cookies)
    }
    
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signInWithProvider = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithProvider,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}