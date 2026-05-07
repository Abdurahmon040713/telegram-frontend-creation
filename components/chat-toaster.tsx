"use client"

import { useChat } from "@/lib/chat-context"
import { Toast, ToastClose, ToastDescription, ToastTitle } from "@/components/ui/toast"
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"

export function ChatToaster() {
  const { state, dispatch } = useChat()

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'info':
      default:
        return 'border-blue-200 bg-blue-50'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {state.toasts.map((toast) => (
        <Toast
          key={toast.id}
          className={`flex items-start gap-3 p-4 border rounded-lg shadow-lg ${getToastStyles(toast.type)}`}
        >
          {getToastIcon(toast.type)}
          <div className="flex-1">
            <ToastTitle className="font-semibold">
              {toast.type === 'success' && 'Muvaffaqiyat'}
              {toast.type === 'error' && 'Xatolik'}
              {toast.type === 'warning' && 'Ogohlantirish'}
              {toast.type === 'info' && 'Ma\'lumot'}
            </ToastTitle>
            <ToastDescription className="mt-1">
              {toast.message}
            </ToastDescription>
          </div>
          <ToastClose
            onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id })}
            className="opacity-70 hover:opacity-100"
          />
        </Toast>
      ))}
    </div>
  )
}