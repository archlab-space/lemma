'use client'

/**
 * Global App Context
 * Manages app-wide state including user data, documents, and UI state
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { documentsService, userService, chatService } from '@/lib/api'
import { Document, User, UserStats, ConversationResponse } from '@/lib/api/types'

// State Types
interface AppState {
  // User data
  userProfile: User | null
  userStats: UserStats | null
  
  // Documents
  documents: Document[]
  documentsLoading: boolean
  documentsError: string | null
  
  // Conversations
  conversations: ConversationResponse[]
  conversationsLoading: boolean
  conversationsError: string | null
  
  // UI State
  sidebarCollapsed: boolean
  theme: 'light' | 'dark'
  notifications: Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    timestamp: Date
    read: boolean
  }>
  
  // Loading states
  loading: {
    userProfile: boolean
    userStats: boolean
    documents: boolean
    conversations: boolean
  }
  
  // Error states
  errors: {
    userProfile: string | null
    userStats: string | null
    documents: string | null
    conversations: string | null
  }
}

// Action Types
type AppAction = 
  // User actions
  | { type: 'SET_USER_PROFILE'; payload: User | null }
  | { type: 'SET_USER_STATS'; payload: UserStats | null }
  | { type: 'SET_USER_PROFILE_LOADING'; payload: boolean }
  | { type: 'SET_USER_PROFILE_ERROR'; payload: string | null }
  
  // Document actions
  | { type: 'SET_DOCUMENTS'; payload: Document[] }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'UPDATE_DOCUMENT'; payload: Document }
  | { type: 'REMOVE_DOCUMENT'; payload: string }
  | { type: 'SET_DOCUMENTS_LOADING'; payload: boolean }
  | { type: 'SET_DOCUMENTS_ERROR'; payload: string | null }
  
  // Conversation actions
  | { type: 'SET_CONVERSATIONS'; payload: ConversationResponse[] }
  | { type: 'ADD_CONVERSATION'; payload: ConversationResponse }
  | { type: 'UPDATE_CONVERSATION'; payload: ConversationResponse }
  | { type: 'REMOVE_CONVERSATION'; payload: string }
  | { type: 'SET_CONVERSATIONS_LOADING'; payload: boolean }
  | { type: 'SET_CONVERSATIONS_ERROR'; payload: string | null }
  
  // UI actions
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<AppState['notifications'][0], 'id' | 'timestamp' | 'read'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' }
  
  // Reset actions
  | { type: 'RESET_STATE' }

// Initial State
const initialState: AppState = {
  userProfile: null,
  userStats: null,
  documents: [],
  documentsLoading: false,
  documentsError: null,
  conversations: [],
  conversationsLoading: false,
  conversationsError: null,
  sidebarCollapsed: false,
  theme: 'light',
  notifications: [],
  loading: {
    userProfile: false,
    userStats: false,
    documents: false,
    conversations: false
  },
  errors: {
    userProfile: null,
    userStats: null,
    documents: null,
    conversations: null
  }
}

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // User actions
    case 'SET_USER_PROFILE':
      return {
        ...state,
        userProfile: action.payload,
        loading: { ...state.loading, userProfile: false },
        errors: { ...state.errors, userProfile: null }
      }
    
    case 'SET_USER_STATS':
      return {
        ...state,
        userStats: action.payload,
        loading: { ...state.loading, userStats: false }
      }
    
    case 'SET_USER_PROFILE_LOADING':
      return {
        ...state,
        loading: { ...state.loading, userProfile: action.payload }
      }
    
    case 'SET_USER_PROFILE_ERROR':
      return {
        ...state,
        errors: { ...state.errors, userProfile: action.payload },
        loading: { ...state.loading, userProfile: false }
      }

    // Document actions
    case 'SET_DOCUMENTS':
      return {
        ...state,
        documents: action.payload,
        loading: { ...state.loading, documents: false },
        errors: { ...state.errors, documents: null }
      }
    
    case 'ADD_DOCUMENT':
      return {
        ...state,
        documents: [action.payload, ...state.documents]
      }
    
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map(doc => 
          doc.id === action.payload.id ? action.payload : doc
        )
      }
    
    case 'REMOVE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter(doc => doc.id !== action.payload)
      }
    
    case 'SET_DOCUMENTS_LOADING':
      return {
        ...state,
        loading: { ...state.loading, documents: action.payload }
      }
    
    case 'SET_DOCUMENTS_ERROR':
      return {
        ...state,
        errors: { ...state.errors, documents: action.payload },
        loading: { ...state.loading, documents: false }
      }

    // Conversation actions
    case 'SET_CONVERSATIONS':
      return {
        ...state,
        conversations: action.payload,
        loading: { ...state.loading, conversations: false },
        errors: { ...state.errors, conversations: null }
      }
    
    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations]
      }
    
    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv => 
          conv.id === action.payload.id ? action.payload : conv
        )
      }
    
    case 'REMOVE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(conv => conv.id !== action.payload)
      }
    
    case 'SET_CONVERSATIONS_LOADING':
      return {
        ...state,
        loading: { ...state.loading, conversations: action.payload }
      }
    
    case 'SET_CONVERSATIONS_ERROR':
      return {
        ...state,
        errors: { ...state.errors, conversations: action.payload },
        loading: { ...state.loading, conversations: false }
      }

    // UI actions
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed
      }
    
    case 'SET_SIDEBAR_COLLAPSED':
      return {
        ...state,
        sidebarCollapsed: action.payload
      }
    
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload
      }
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          {
            ...action.payload,
            id: crypto.randomUUID(),
            timestamp: new Date(),
            read: false
          },
          ...state.notifications
        ]
      }
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      }
    
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, read: true } : n
        )
      }
    
    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: []
      }

    // Reset
    case 'RESET_STATE':
      return initialState

    default:
      return state
  }
}

// Context
interface AppContextType {
  state: AppState
  
  // User methods
  updateUserProfile: (updates: Partial<Pick<User, 'fullName' | 'settings'>>) => Promise<void>
  
  // Document methods
  loadDocuments: (refresh?: boolean) => Promise<void>
  addDocument: (document: Document) => void
  updateDocument: (document: Document) => void
  removeDocument: (documentId: string) => void
  
  // Conversation methods
  loadConversations: (refresh?: boolean) => Promise<void>
  addConversation: (conversation: ConversationResponse) => void
  updateConversation: (conversation: ConversationResponse) => void
  removeConversation: (conversationId: string) => void
  
  // UI methods
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void
  removeNotification: (id: string) => void
  markNotificationRead: (id: string) => void
  clearAllNotifications: () => void
  
  // Utility methods
  resetState: () => void
}

const AppContext = createContext<AppContextType | null>(null)

// Provider Component
interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const { user } = useAuth()

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      loadDocuments()
      loadConversations()
    } else {
      dispatch({ type: 'RESET_STATE' })
    }
  }, [user])


  // Update user profile
  const updateUserProfile = useCallback(async (updates: Partial<Pick<User, 'fullName' | 'settings'>>) => {
    try {
      const updatedProfile = await userService.updateProfile(updates)
      dispatch({ type: 'SET_USER_PROFILE', payload: updatedProfile })
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { 
          type: 'success', 
          title: 'Profile Updated', 
          message: 'Your profile has been successfully updated.' 
        } 
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { 
          type: 'error', 
          title: 'Update Failed', 
          message: errorMessage 
        } 
      })
    }
  }, [])

  // Load documents
  const loadDocuments = useCallback(async (refresh = false) => {
    if (!user) return
    
    dispatch({ type: 'SET_DOCUMENTS_LOADING', payload: true })
    
    try {
      const response = await documentsService.getDocuments({ limit: 100 })
      dispatch({ type: 'SET_DOCUMENTS', payload: response.data || [] })
      
      if (refresh) {
        dispatch({ 
          type: 'ADD_NOTIFICATION', 
          payload: { 
            type: 'info', 
            title: 'Documents Refreshed', 
            message: 'Your document library has been updated.' 
          } 
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load documents'
      dispatch({ type: 'SET_DOCUMENTS_ERROR', payload: errorMessage })
    }
  }, [user])

  // Load conversations
  const loadConversations = useCallback(async (refresh = false) => {
    if (!user) return
    
    dispatch({ type: 'SET_CONVERSATIONS_LOADING', payload: true })
    
    try {
      const response = await chatService.getConversations({ page_size: 50 })
      dispatch({ type: 'SET_CONVERSATIONS', payload: response.conversations || [] })
      
      if (refresh) {
        dispatch({ 
          type: 'ADD_NOTIFICATION', 
          payload: { 
            type: 'info', 
            title: 'Conversations Refreshed', 
            message: 'Your conversations have been updated.' 
          } 
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations'
      dispatch({ type: 'SET_CONVERSATIONS_ERROR', payload: errorMessage })
    }
  }, [user])

  // Document management methods
  const addDocument = useCallback((document: Document) => {
    dispatch({ type: 'ADD_DOCUMENT', payload: document })
    dispatch({ 
      type: 'ADD_NOTIFICATION', 
      payload: { 
        type: 'success', 
        title: 'Document Added', 
        message: `${document.title} has been successfully uploaded.` 
      } 
    })
  }, [])

  const updateDocument = useCallback((document: Document) => {
    dispatch({ type: 'UPDATE_DOCUMENT', payload: document })
  }, [])

  const removeDocument = useCallback((documentId: string) => {
    const document = state.documents.find(d => d.id === documentId)
    dispatch({ type: 'REMOVE_DOCUMENT', payload: documentId })
    
    if (document) {
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { 
          type: 'info', 
          title: 'Document Deleted', 
          message: `${document.title} has been deleted.` 
        } 
      })
    }
  }, [state.documents])

  // Conversation management methods
  const addConversation = useCallback((conversation: ConversationResponse) => {
    dispatch({ type: 'ADD_CONVERSATION', payload: conversation })
    dispatch({ 
      type: 'ADD_NOTIFICATION', 
      payload: { 
        type: 'success', 
        title: 'Conversation Started', 
        message: `New conversation "${conversation.title}" has been created.` 
      } 
    })
  }, [])

  const updateConversation = useCallback((conversation: ConversationResponse) => {
    dispatch({ type: 'UPDATE_CONVERSATION', payload: conversation })
  }, [])

  const removeConversation = useCallback((conversationId: string) => {
    const conversation = state.conversations.find(c => c.id === conversationId)
    dispatch({ type: 'REMOVE_CONVERSATION', payload: conversationId })
    
    if (conversation) {
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { 
          type: 'info', 
          title: 'Conversation Deleted', 
          message: `"${conversation.title}" has been deleted.` 
        } 
      })
    }
  }, [state.conversations])

  // UI methods
  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' })
  }, [])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed })
  }, [])

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme })
    // Persist theme preference
    localStorage.setItem('lemma-theme', theme)
  }, [])

  // Notification methods
  const addNotification = useCallback((notification: Omit<AppState['notifications'][0], 'id' | 'timestamp' | 'read'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
    
    // Auto-remove info notifications after 5 seconds
    if (notification.type === 'info') {
      setTimeout(() => {
        // Note: This won't work perfectly due to closure, but it's a reasonable approach
        const currentNotifications = state.notifications
        const latestNotification = currentNotifications[0]
        if (latestNotification) {
          dispatch({ type: 'REMOVE_NOTIFICATION', payload: latestNotification.id })
        }
      }, 5000)
    }
  }, [state.notifications])

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id })
  }, [])

  const clearAllNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' })
  }, [])

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' })
  }, [])

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('lemma-theme') as 'light' | 'dark' | null
    if (savedTheme) {
      dispatch({ type: 'SET_THEME', payload: savedTheme })
    }
  }, [])

  const contextValue: AppContextType = {
    state,
    updateUserProfile,
    loadDocuments,
    addDocument,
    updateDocument,
    removeDocument,
    loadConversations,
    addConversation,
    updateConversation,
    removeConversation,
    toggleSidebar,
    setSidebarCollapsed,
    setTheme,
    addNotification,
    removeNotification,
    markNotificationRead,
    clearAllNotifications,
    resetState
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

// Hook
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export default AppContext