"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertTriangle, Ban, BarChart3, ChevronDown,
  Clock, Loader2, MessageSquare, Radio,
  RefreshCw, Search, Shield, ShieldCheck,
  Users,
} from "lucide-react"
import { Button }        from "@/components/ui/button"
import { Input }         from "@/components/ui/input"
import { Badge }         from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertMessage }  from "@/components/alert-message"
import { chatsApi, ApiError, type Chat, type AnalyzeResponse } from "@/lib/api"
import { cn }            from "@/lib/utils"
import { useApiError }   from "@/lib/hooks/useApiError"

// ── Constants ─────────────────────────────────────────────────────────────────

const LIMIT_OPTIONS = [
  { value: 25,  label: "25 xabar"  },
  { value: 50,  label: "50 xabar"  },
  { value: 100, label: "100 xabar" },
  { value: 200, label: "200 xabar" },
  { value: 500, label: "500 xabar" },
]

const POLL_INTERVAL_MS = 2_000
const POLL_TIMEOUT_MS  = 5 * 60_000

// ── Types ─────────────────────────────────────────────────────────────────────

interface ViolationRecord {
  user_id:    number
  warn_count: number
  is_muted:   boolean
  is_banned:  boolean
  muted_until: string | null
}

type RightPanel = 'analysis' | 'monitor'

interface ChatsContentProps {
  initialChats: Chat[]
  initialPhone: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatsContent({ initialChats, initialPhone }: ChatsContentProps) {
  const { handleError } = useApiError()

  // Chat list
  const [chats, setChats]             = useState<Chat[]>(initialChats)
  const [loading, setLoading]         = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError]             = useState<string | null>(null)
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [rightPanel, setRightPanel]   = useState<RightPanel>('analysis')

  // Analysis
  const [analyzing, setAnalyzing]           = useState<number | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null)
  const [limit, setLimit]                   = useState(50)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Monitor
  const [monitoredChats, setMonitoredChats]         = useState<Set<number>>(new Set())
  const [monitorLoading, setMonitorLoading]         = useState<number | null>(null)
  const [violations, setViolations]                 = useState<ViolationRecord[] | null>(null)
  const [violationsLoading, setViolationsLoading]   = useState(false)

  // Refs
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Prevents concurrent violations fetches (e.g. tab-switch + auto-fetch racing)
  const violationsInFlight = useRef(false)

  // ── On mount: fetch which chats are already monitored ────────────────────────
  useEffect(() => {
    fetch('/api/monitor/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data?.monitored_chats) && data.monitored_chats.length) {
          setMonitoredChats(new Set(data.monitored_chats as number[]))
        }
      })
      .catch(() => {})

    return () => {
      abortRef.current?.abort()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ── Timer helpers ─────────────────────────────────────────────────────────────
  const startElapsedTimer = () => {
    setElapsedSeconds(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1_000)
  }

  const stopElapsedTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  // ── Analysis ──────────────────────────────────────────────────────────────────
  const handleAnalyze = async (chat: Chat) => {
    if (!initialPhone) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current  = controller

    setAnalyzing(chat.id)
    setSelectedChat(chat)
    setRightPanel('analysis')
    setError(null)
    setAnalysisResult(null)
    startElapsedTimer()

    try {
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
      if (!job_id) throw new Error("Backend job_id qaytarmadi")

      // Backend cached — already done
      if (startData.status === 'done' && startData.result) {
        setAnalysisResult(startData.result as AnalyzeResponse)
        return
      }

      // Poll until done or timeout
      const deadline = Date.now() + POLL_TIMEOUT_MS
      while (Date.now() < deadline) {
        if (controller.signal.aborted) return
        await new Promise<void>(r => setTimeout(r, POLL_INTERVAL_MS))
        if (controller.signal.aborted) return

        const statusRes = await fetch(`/api/analyze/status/${job_id}`, {
          signal: controller.signal,
        })
        if (!statusRes.ok) {
          const errData = await statusRes.json().catch(() => ({ detail: statusRes.statusText }))
          throw new ApiError(statusRes.status, errData.detail || statusRes.statusText)
        }

        const status = await statusRes.json()
        if (status.status === 'done')  { setAnalysisResult(status.result as AnalyzeResponse); return }
        if (status.status === 'error') throw new Error(status.error || "Tahlil xatoligi")
      }

      throw new Error("Tahlil juda uzoq davom etdi. Keyinroq qayta urining.")
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(await handleError(err))
    } finally {
      setAnalyzing(null)
      abortRef.current = null
      stopElapsedTimer()
    }
  }

  // ── Monitor toggle (start / stop) ─────────────────────────────────────────────
  const handleMonitorToggle = async (chat: Chat) => {
    if (!initialPhone) return
    const isActive = monitoredChats.has(chat.id)
    const endpoint = isActive ? '/api/monitor/stop' : '/api/monitor/start'

    setMonitorLoading(chat.id)
    setError(null)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: initialPhone, chat_id: chat.id }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new ApiError(res.status, err.detail || res.statusText)
      }

      setMonitoredChats(prev => {
        const next = new Set(prev)
        isActive ? next.delete(chat.id) : next.add(chat.id)
        return next
      })

      setSelectedChat(chat)
      setRightPanel('monitor')

      if (!isActive) {
        // Just started monitoring — violations are empty at this moment.
        // Set [] directly to show the "no violations" empty state without an API call.
        // User can click "Yangilash" when they want to check after test messages.
        setViolations([])
      } else {
        setViolations(null)
      }
    } catch (err: unknown) {
      setError(await handleError(err))
    } finally {
      setMonitorLoading(null)
    }
  }

  // ── Fetch violations ──────────────────────────────────────────────────────────
  const handleFetchViolations = useCallback(async (chatId: number) => {
    // Guard against concurrent calls (tab-switch + button click racing)
    if (violationsInFlight.current) return
    violationsInFlight.current = true

    setViolationsLoading(true)
    setViolations(null)
    try {
      const res = await fetch(`/api/violations/${chatId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new ApiError(res.status, err.detail || res.statusText)
      }
      const data = await res.json()
      setViolations(data.violations ?? [])
    } catch (err: unknown) {
      setError(await handleError(err))
    } finally {
      setViolationsLoading(false)
      violationsInFlight.current = false
    }
  }, [handleError])

  // ── Chat list refresh ─────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await chatsApi.getChats(initialPhone)
      setChats(response.chats)
    } catch (err: unknown) {
      setError(await handleError(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getChatIcon = (type: string) => {
    if (type === "Group")   return Users
    if (type === "Channel") return Radio
    return MessageSquare
  }

  // ── Full-page loading ─────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chatlar</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span>{chats.length} ta chat</span>
              {monitoredChats.size > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {monitoredChats.size} ta kuzatilmoqda
                </span>
              )}
            </p>
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
          <AlertMessage type="error" message={error} onClose={() => setError(null)} className="mb-6" />
        )}

        {/* ── Search bar ──────────────────────────────────────────────────── */}
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

          {/* ── Chat list ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            {filteredChats.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Chat topilmadi</p>
              </div>
            ) : (
              filteredChats.map(chat => {
                const Icon        = getChatIcon(chat.type)
                const isMonitored = monitoredChats.has(chat.id)
                const isSelected  = selectedChat?.id === chat.id

                return (
                  <div
                    key={chat.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 transition-colors",
                      isSelected && "border-primary/40 bg-primary/5",
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                      chat.type === "Group"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : chat.type === "Channel"
                          ? "bg-violet-500/10 text-violet-500"
                          : "bg-sky-500/10 text-sky-500",
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-foreground truncate">{chat.title}</h3>
                        {isMonitored && (
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{chat.type}</p>
                    </div>

                    {/* Monitor toggle button */}
                    <Button
                      size="sm"
                      variant={isMonitored ? "default" : "outline"}
                      onClick={() => handleMonitorToggle(chat)}
                      disabled={monitorLoading === chat.id || analyzing === chat.id}
                      className={cn(
                        "h-8 w-8 shrink-0 p-0",
                        isMonitored && "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white",
                      )}
                      title={isMonitored ? "Kuzatuvni to'xtatish" : "Kuzatuvni boshlash"}
                    >
                      {monitorLoading === chat.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isMonitored ? (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      ) : (
                        <Shield className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    {/* Analyze button */}
                    <Button
                      size="sm"
                      onClick={() => handleAnalyze(chat)}
                      disabled={analyzing === chat.id}
                    >
                      {analyzing === chat.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                          Tahlil
                        </>
                      )}
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          {/* ── Right panel ─────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-24 lg:self-start">

            {/* Tabs — only when a chat is selected and not analyzing */}
            {selectedChat && analyzing === null && (
              <div className="flex border-b border-border/40 mb-0 rounded-t-2xl overflow-hidden bg-card border border-border/40 border-b-0">
                <button
                  onClick={() => setRightPanel('analysis')}
                  className={cn(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                    rightPanel === 'analysis'
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <BarChart3 className="inline h-3.5 w-3.5 mr-1.5" />
                  Tahlil
                </button>
                <button
                  onClick={() => {
                    setRightPanel('monitor')
                    // Only fetch if no in-flight request already running
                    if (selectedChat && !violationsInFlight.current && !violationsLoading) {
                      handleFetchViolations(selectedChat.id)
                    }
                  }}
                  className={cn(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                    rightPanel === 'monitor'
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Monitoring
                  {monitoredChats.has(selectedChat.id) && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              </div>
            )}

            {/* ── Analyzing spinner ──────────────────────────────────── */}
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
                  variant="ghost" size="sm"
                  className="mt-4 text-muted-foreground"
                  onClick={() => { abortRef.current?.abort(); setAnalyzing(null); stopElapsedTimer() }}
                >
                  Bekor qilish
                </Button>
              </div>

            /* ── Analysis results panel ────────────────────────────── */
            ) : rightPanel === 'analysis' ? (
              analysisResult && selectedChat ? (
                <div className={cn(
                  "border border-border/40 bg-card p-6",
                  selectedChat && analyzing === null
                    ? "rounded-b-2xl rounded-tr-2xl"
                    : "rounded-2xl"
                )}>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-sm text-muted-foreground">Tahlil qilindi</p>
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {analysisResult.analyzed_count}
                      </p>
                    </div>
                    <div className="rounded-xl bg-red-500/10 p-4">
                      <p className="text-sm text-red-400">Negativ</p>
                      <p className="text-2xl font-bold text-red-400 tabular-nums">
                        {analysisResult.negative_count}
                      </p>
                    </div>
                  </div>

                  {analysisResult.negative_messages.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Negativ xabarlar
                      </h3>
                      {analysisResult.negative_messages.map(msg => (
                        <div key={msg.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                {msg.reason === 'keyword_match' && (
                                  <Badge variant="secondary"
                                    className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                                    Lug&apos;at
                                  </Badge>
                                )}
                                {msg.reason === 'ai_sentiment' && (
                                  <Badge variant="secondary"
                                    className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">
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
                    <div className="text-center py-6">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                        <MessageSquare className="h-6 w-6 text-emerald-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">Negativ xabarlar topilmadi!</p>
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
              )

            /* ── Monitor / violations panel ────────────────────────── */
            ) : (
              <div className={cn(
                "border border-border/40 bg-card p-6",
                selectedChat && analyzing === null
                  ? "rounded-b-2xl rounded-tr-2xl"
                  : "rounded-2xl"
              )}>
                {!selectedChat ? (
                  <div className="text-center py-8">
                    <Shield className="mx-auto h-12 w-12 text-muted-foreground/40" />
                    <h3 className="mt-4 font-medium text-foreground">Monitoring</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Monitoring uchun chat tanlang va{" "}
                      <Shield className="inline h-3.5 w-3.5" /> tugmasini bosing
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Monitor status bar */}
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                          {selectedChat.title}
                        </p>
                        {monitoredChats.has(selectedChat.id) ? (
                          <p className="flex items-center gap-1 text-xs text-emerald-500 mt-0.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Real-time kuzatilmoqda
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Kuzatuv o&apos;chirilgan
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => handleFetchViolations(selectedChat.id)}
                          disabled={violationsLoading}
                        >
                          <RefreshCw className={cn(
                            "h-3.5 w-3.5 mr-1.5",
                            violationsLoading && "animate-spin"
                          )} />
                          Yangilash
                        </Button>
                        <Button
                          size="sm"
                          variant={monitoredChats.has(selectedChat.id) ? "default" : "outline"}
                          onClick={() => handleMonitorToggle(selectedChat)}
                          disabled={monitorLoading === selectedChat.id}
                          className={cn(
                            monitoredChats.has(selectedChat.id) &&
                            "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                          )}
                        >
                          {monitorLoading === selectedChat.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : monitoredChats.has(selectedChat.id) ? (
                            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                          ) : (
                            <Shield className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {monitoredChats.has(selectedChat.id) ? "To'xtatish" : "Boshlash"}
                        </Button>
                      </div>
                    </div>

                    {/* Violations list */}
                    {violationsLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        <p className="mt-2 text-sm text-muted-foreground">Yuklanmoqda...</p>
                      </div>
                    ) : violations && violations.length > 0 ? (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                          {violations.length} ta qoidabuzarlik
                        </p>
                        {violations.map((v, idx) => (
                          <div
                            key={`${v.user_id}-${idx}`}
                            className={cn(
                              "rounded-lg border p-3",
                              v.is_banned
                                ? "border-red-500/30 bg-red-500/5"
                                : v.is_muted
                                  ? "border-amber-500/30 bg-amber-500/5"
                                  : "border-border/40 bg-muted/20"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-mono text-foreground">
                                User #{v.user_id}
                              </span>
                              <div className="flex gap-1.5">
                                {v.is_banned && (
                                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] h-5">
                                    <Ban className="h-3 w-3 mr-0.5" />
                                    Bloklangan
                                  </Badge>
                                )}
                                {v.is_muted && !v.is_banned && (
                                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] h-5">
                                    Jimtirilgan
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Ogohlantirish:{" "}
                              <span className="font-medium text-foreground">{v.warn_count}</span>
                              {v.muted_until && (
                                <span className="ml-2 opacity-70">
                                  · {new Date(v.muted_until).toLocaleString('uz-UZ')}
                                </span>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : violations !== null ? (
                      <div className="text-center py-8">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                          <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Bu chatda qoidabuzarlik yozuvlari topilmadi
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">
                          Qoidabuzarliklarni ko&apos;rish uchun &quot;Yangilash&quot; tugmasini bosing
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
