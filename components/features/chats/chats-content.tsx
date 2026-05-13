"use client"

import { useEffect, useRef, useState } from "react"
import {
  MessageSquare,
  Users,
  Radio,
  Loader2,
  Search,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Clock,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertMessage } from "@/components/alert-message"
import { chatsApi, ApiError, type Chat, type AnalyzeResponse } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useApiError } from "@/lib/hooks/useApiError"

const LIMIT_OPTIONS = [
  { value: 25,  label: "25 xabar"  },
  { value: 50,  label: "50 xabar"  },
  { value: 100, label: "100 xabar" },
  { value: 200, label: "200 xabar" },
  { value: 500, label: "500 xabar" },
]

interface ChatsContentProps {
  initialChats: Chat[]
  initialPhone: string
}

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 5 * 60 * 1000  // 5 minutes

export function ChatsContent({ initialChats, initialPhone }: ChatsContentProps) {
  const { handleError } = useApiError()
  const [chats, setChats] = useState<Chat[]>(initialChats)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null)
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [limit, setLimit] = useState(50)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startElapsedTimer = () => {
    setElapsedSeconds(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(
      () => setElapsedSeconds(s => s + 1),
      1000
    )
  }

  const stopElapsedTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const handleAnalyze = async (chat: Chat) => {
    if (!initialPhone) return

    // Cancel previous request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setAnalyzing(chat.id)
    setSelectedChat(chat)
    setError(null)
    setAnalysisResult(null)
    startElapsedTimer()

    try {
      // Step 1: Start the job
      const startRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: initialPhone, chat_id: chat.id, limit }),
        signal: controller.signal,
      })

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({ detail: startRes.statusText }))
        throw new ApiError(startRes.status, errData.detail || startRes.statusText)
      }

      const startData = await startRes.json()
      const { job_id } = startData as { status: string; job_id: string }

      if (!job_id) {
        throw new Error("Backend job_id qaytarmadi")
      }

      // If the backend already has a cached result it sets status=done immediately
      if (startData.status === 'done' && startData.result) {
        setAnalysisResult(startData.result as AnalyzeResponse)
        return
      }

      // Step 2: Poll until done or timeout
      const deadline = Date.now() + POLL_TIMEOUT_MS

      while (Date.now() < deadline) {
        if (controller.signal.aborted) return

        await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

        if (controller.signal.aborted) return

        const statusRes = await fetch(`/api/analyze/status/${job_id}`, {
          signal: controller.signal,
        })

        if (!statusRes.ok) {
          const errData = await statusRes.json().catch(() => ({ detail: statusRes.statusText }))
          throw new ApiError(statusRes.status, errData.detail || statusRes.statusText)
        }

        const status = await statusRes.json()

        if (status.status === 'done') {
          setAnalysisResult(status.result as AnalyzeResponse)
          return
        }

        if (status.status === 'error') {
          throw new Error(status.error || "Tahlil davomida xatolik yuz berdi")
        }

        // status is "queued" or "running" — keep polling
      }

      throw new Error("Tahlil juda uzoq davom etdi. Keyinroq qayta urining.")
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const errorMsg = await handleError(err)
      setError(errorMsg)
    } finally {
      setAnalyzing(null)
      abortRef.current = null
      stopElapsedTimer()
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await chatsApi.getChats(initialPhone)
      setChats(response.chats)
    } catch (err: unknown) {
      const errorMsg = await handleError(err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getChatIcon = (type: string) => {
    if (type === "Group") return Users
    if (type === "Channel") return Radio
    return MessageSquare
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Chatlar yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chatlar</h1>
            <p className="text-sm text-muted-foreground">{chats.length} ta chat topildi</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  {LIMIT_OPTIONS.find(o => o.value === limit)?.label ?? `${limit} xabar`}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={String(limit)}
                  onValueChange={v => setLimit(Number(v))}
                >
                  {LIMIT_OPTIONS.map(o => (
                    <DropdownMenuRadioItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Yangilash
            </Button>
          </div>
        </div>

        {error && (
          <AlertMessage
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Chatlarni qidirish..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat list */}
          <div className="space-y-2">
            {filteredChats.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Chat topilmadi</p>
              </div>
            ) : (
              filteredChats.map(chat => {
                const Icon = getChatIcon(chat.type)
                return (
                  <div
                    key={chat.id}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border border-border/40 bg-card p-4 transition-colors",
                      selectedChat?.id === chat.id && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                        chat.type === "Group"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : chat.type === "Channel"
                            ? "bg-violet-500/10 text-violet-500"
                            : "bg-sky-500/10 text-sky-500",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{chat.title}</h3>
                      <p className="text-xs text-muted-foreground">{chat.type}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAnalyze(chat)}
                      disabled={analyzing === chat.id}
                    >
                      {analyzing === chat.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Tahlil
                        </>
                      )}
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          {/* Analysis result panel */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {analyzing !== null && selectedChat ? (
              <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                <h3 className="mt-4 font-medium text-foreground">
                  {selectedChat.title} tahlil qilinmoqda...
                </h3>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{elapsedSeconds}s</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  AI modelni ishlatish vaqt talab qiladi
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-muted-foreground"
                  onClick={() => {
                    abortRef.current?.abort()
                    setAnalyzing(null)
                    stopElapsedTimer()
                  }}
                >
                  Bekor qilish
                </Button>
              </div>
            ) : analysisResult && selectedChat ? (
              <div className="rounded-2xl border border-border/40 bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Tahlil natijalari: {selectedChat.title}
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Tahlil qilindi</p>
                    <p className="text-2xl font-bold text-foreground">
                      {analysisResult.analyzed_count}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-500/10 p-4">
                    <p className="text-sm text-red-400">Negativ xabarlar</p>
                    <p className="text-2xl font-bold text-red-400">
                      {analysisResult.negative_count}
                    </p>
                  </div>
                </div>

                {analysisResult.negative_messages.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Negativ xabarlar ro&apos;yxati:
                    </h3>
                    {analysisResult.negative_messages.map(msg => (
                      <div
                        key={msg.id}
                        className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {msg.reason === 'keyword_match' && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-500/10 text-blue-600 border-blue-500/20"
                                >
                                  Lug&apos;at
                                </Badge>
                              )}
                              {msg.reason === 'ai_sentiment' && (
                                <Badge
                                  variant="secondary"
                                  className="bg-purple-500/10 text-purple-600 border-purple-500/20"
                                >
                                  AI Tahlili
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>
                            {msg.reason === 'ai_sentiment' && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Ishonch: {(msg.confidence * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                      <MessageSquare className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="text-muted-foreground">Negativ xabarlar topilmadi!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium text-foreground">Tahlil qilish</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Chatni tanlang va &quot;Tahlil&quot; tugmasini bosing
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
