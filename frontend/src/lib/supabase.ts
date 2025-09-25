/**
 * Supabase client configuration for Lemma frontend
 */

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Types for our application
export interface User {
  id: string
  email: string
  created_at?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    provider?: string
  }
  app_metadata?: {
    provider?: string
    providers?: string[]
  }
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  token_type: string
  user: User
}