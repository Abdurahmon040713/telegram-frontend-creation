"use client"

import React, { createContext, useContext, useReducer, ReactNode } from 'react'

// Types
export interface Chat {
  id: number
  title: string
  type: string
  // Qo'shimcha maydonlar
}

export interface AnalysisResult {
  sentiment?: string
  summary?: string
  // Qo'shimcha tahlil natijalari
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

interface ChatState {
  selectedChat: Chat | null
  analysis: {
    loading: boolean
    data: AnalysisResult | null
    error: string | null
  }
  toasts: Toast[]
}

// Actions
type ChatAction =
  | { type: 'SET_SELECTED_CHAT'; payload: Chat | null }
  | { type: 'SET_ANALYSIS_LOADING'; payload: boolean }
  | { type: 'SET_ANALYSIS_DATA'; payload: AnalysisResult | null }
  | { type: 'SET_ANALYSIS_ERROR'; payload: string | null }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }

// Reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_SELECTED_CHAT':
      return { ...state, selectedChat: action.payload }
    case 'SET_ANALYSIS_LOADING':
      return {
        ...state,
        analysis: { ...state.analysis, loading: action.payload }
      }
    case 'SET_ANALYSIS_DATA':
      return {
        ...state,
        analysis: { ...state.analysis, data: action.payload, loading: false, error: null }
      }
    case 'SET_ANALYSIS_ERROR':
      return {
        ...state,
        analysis: { ...state.analysis, error: action.payload, loading: false }
      }
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.payload]
      }
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload)
      }
    default:
      return state
  }
}

// Initial state
const initialState: ChatState = {
  selectedChat: null,
  analysis: {
    loading: false,
    data: null,
    error: null,
  },
  toasts: [],
}

// Context
const ChatContext = createContext<{
  state: ChatState
  dispatch: React.Dispatch<ChatAction>
} | null>(null)

// Provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  )
}

// Custom hook
export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

// Action creators
export const chatActions = {
  setSelectedChat: (chat: Chat | null) => ({
    type: 'SET_SELECTED_CHAT' as const,
    payload: chat,
  }),

  setAnalysisLoading: (loading: boolean) => ({
    type: 'SET_ANALYSIS_LOADING' as const,
    payload: loading,
  }),

  setAnalysisData: (data: AnalysisResult | null) => ({
    type: 'SET_ANALYSIS_DATA' as const,
    payload: data,
  }),

  setAnalysisError: (error: string | null) => ({
    type: 'SET_ANALYSIS_ERROR' as const,
    payload: error,
  }),

  addToast: (toast: Omit<Toast, 'id'>) => ({
    type: 'ADD_TOAST' as const,
    payload: {
      id: Date.now().toString(),
      ...toast,
    },
  }),

  removeToast: (id: string) => ({
    type: 'REMOVE_TOAST' as const,
    payload: id,
  }),
}