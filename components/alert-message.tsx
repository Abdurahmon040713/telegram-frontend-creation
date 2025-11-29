"use client"

import { AlertCircle, CheckCircle, XCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AlertMessageProps {
  type: "success" | "error" | "warning" | "info"
  message: string
  onClose?: () => void
  className?: string
}

export function AlertMessage({ type, message, onClose, className }: AlertMessageProps) {
  const styles = {
    success: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-400",
      icon: CheckCircle,
    },
    error: {
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-400",
      icon: XCircle,
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-400",
      icon: AlertCircle,
    },
    info: {
      bg: "bg-sky-500/10 border-sky-500/20",
      text: "text-sky-400",
      icon: Info,
    },
  }

  const { bg, text, icon: Icon } = styles[type]

  return (
    <div className={cn("flex items-center gap-3 rounded-lg border p-4", bg, className)}>
      <Icon className={cn("h-5 w-5 shrink-0", text)} />
      <p className={cn("text-sm flex-1", text)}>{message}</p>
      {onClose && (
        <button onClick={onClose} className={cn("shrink-0 hover:opacity-70 transition-opacity", text)}>
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
