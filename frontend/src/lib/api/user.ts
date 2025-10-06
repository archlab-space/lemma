/**
 * User API Service
 * Handles user profile and settings related API operations
 */

import { apiClient } from './client'
import { User, UserStats, RequestConfig } from './types'

class UserService {
  private basePath = '/api/v1/user'

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>(`${this.basePath}/profile`)
    return response.data!
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<Pick<User, 'fullName' | 'settings'>>): Promise<User> {
    const response = await apiClient.put<User>(`${this.basePath}/profile`, updates)
    return response.data!
  }

  /**
   * Update user settings
   */
  async updateSettings(settings: User['settings']): Promise<User> {
    const response = await apiClient.put<User>(`${this.basePath}/settings`, { settings })
    return response.data!
  }

  /**
   * Get user statistics and usage data
   */
  async getStats(): Promise<UserStats> {
    const response = await apiClient.get<UserStats>(`${this.basePath}/stats`)
    return response.data!
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(): Promise<User> {
    const response = await apiClient.delete<User>(`${this.basePath}/avatar`)
    return response.data!
  }

  /**
   * Get user activity history
   */
  async getActivity(options?: {
    page?: number
    limit?: number
    type?: 'upload' | 'chat' | 'delete' | 'login'
    from?: string
    to?: string
  }): Promise<{
    activities: Array<{
      id: string
      type: string
      description: string
      timestamp: string
      metadata?: Record<string, unknown>
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const params = new URLSearchParams()
    
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.type) params.append('type', options.type)
    if (options?.from) params.append('from', options.from)
    if (options?.to) params.append('to', options.to)

    const query = params.toString()
    const endpoint = `${this.basePath}/activity${query ? `?${query}` : ''}`
    
    const response = await apiClient.get<{
      activities: Array<{
        id: string
        type: string
        description: string
        timestamp: string
        metadata?: Record<string, unknown>
      }>
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>(endpoint)
    return response.data!
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportData(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response = await fetch(`${apiClient['baseUrl']}${this.basePath}/export?format=${format}`, {
      method: 'GET',
      headers: await apiClient['getAuthHeaders']()
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`)
    }

    return response.blob()
  }

  /**
   * Request account deletion
   */
  async deleteAccount(confirmation: string): Promise<void> {
    await apiClient.post(`${this.basePath}/delete-account`, {
      confirmation
    })
  }

  /**
   * Get user preferences (theme, language, etc.)
   */
  async getPreferences(): Promise<User['settings']> {
    const response = await apiClient.get(`${this.basePath}/preferences`)
    return response.data!
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: User['settings']): Promise<User['settings']> {
    const response = await apiClient.put(`${this.basePath}/preferences`, preferences)
    return response.data!
  }

  /**
   * Get user's API usage and limits
   */
  async getUsage(): Promise<{
    current: {
      documents: number
      storage: number
      apiCalls: number
      chatMessages: number
    }
    limits: {
      documents: number
      storage: number
      apiCalls: number
      chatMessages: number
    }
    period: {
      start: string
      end: string
      type: 'monthly' | 'daily'
    }
  }> {
    const response = await apiClient.get<{
      current: {
        documents: number
        storage: number
        apiCalls: number
        chatMessages: number
      }
      limits: {
        documents: number
        storage: number
        apiCalls: number
        chatMessages: number
      }
      period: {
        start: string
        end: string
        type: 'monthly' | 'daily'
      }
    }>(`${this.basePath}/usage`)
    return response.data!
  }

  /**
   * Subscribe to notifications (webhooks, email, etc.)
   */
  async updateNotificationSettings(settings: {
    email?: {
      documentProcessed?: boolean
      weeklyDigest?: boolean
      systemUpdates?: boolean
    }
    push?: {
      documentProcessed?: boolean
      chatMentions?: boolean
    }
  }): Promise<void> {
    await apiClient.put(`${this.basePath}/notifications`, settings)
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<{
    email: {
      documentProcessed: boolean
      weeklyDigest: boolean
      systemUpdates: boolean
    }
    push: {
      documentProcessed: boolean
      chatMentions: boolean
    }
  }> {
    const response = await apiClient.get<{
      email: {
        documentProcessed: boolean
        weeklyDigest: boolean
        systemUpdates: boolean
      }
      push: {
        documentProcessed: boolean
        chatMentions: boolean
      }
    }>(`${this.basePath}/notifications`)
    return response.data!
  }
}

export const userService = new UserService()
export default userService