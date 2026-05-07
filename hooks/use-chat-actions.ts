"use client"

import { useChat, chatActions } from "@/lib/chat-context"

// Custom hook for chat operations
export function useChatActions() {
  const { state, dispatch } = useChat()

  return {
    // State getters
    selectedChat: state.selectedChat,
    analysis: state.analysis,
    toasts: state.toasts,

    // Chat actions
    setSelectedChat: (chat: any) => dispatch(chatActions.setSelectedChat(chat)),

    // Analysis actions
    setAnalysisLoading: (loading: boolean) => dispatch(chatActions.setAnalysisLoading(loading)),
    setAnalysisData: (data: any) => dispatch(chatActions.setAnalysisData(data)),
    setAnalysisError: (error: string | null) => dispatch(chatActions.setAnalysisError(error)),

    // Toast actions
    addToast: (toast: { type: 'success' | 'error' | 'info' | 'warning', message: string, duration?: number }) =>
      dispatch(chatActions.addToast(toast)),
    removeToast: (id: string) => dispatch(chatActions.removeToast(id)),

    // Convenience methods
    showSuccess: (message: string) => dispatch(chatActions.addToast({ type: 'success', message })),
    showError: (message: string) => dispatch(chatActions.addToast({ type: 'error', message })),
    showInfo: (message: string) => dispatch(chatActions.addToast({ type: 'info', message })),
    showWarning: (message: string) => dispatch(chatActions.addToast({ type: 'warning', message })),
  }
}