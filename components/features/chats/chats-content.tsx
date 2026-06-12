"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle, Ban, BarChart3, ChevronDown,
  Clock, Loader2, MessageSquare, Radio,
  RefreshCw, RotateCcw, Search, Shield, ShieldAlert, ShieldCheck,
  Timer, Users, Volume2, VolumeX,
} from "lucide-react"
import { Button }        from "@/components/ui/button"
import { Input }         from "@/components/ui/input"
import { Badge }         from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertMessage }  from "@/components/alert-message"
import {
  chatsApi, ApiError, moderationApi,
  type Chat, type AnalyzeResponse, type ViolationRecord, type MutePreset,
} from "@/lib/api"
import { formatChatLabel } from "@/lib/format-chat-label"
import { formatUserLabel } from "@/lib/format-user-label"
import { cn }            from "@/lib/utils"
import { useApiError }   from "@/lib/hooks/useApiError"
import { BlacklistPanel } from "@/components/features/chats/blacklist-panel"
import {
  AnalysisReasonFilterChips,
  ReasonBadge,
  formatConfidencePercent,
  filterMessagesByReason,
  type ReasonFilterValue,
} from "@/components/features/chats/analysis-filters"

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

const FALLBACK_MUTE_PRESETS: MutePreset[] = [
  { minutes: 5,     label: "5 daqiqa" },
  { minutes: 15,    label: "15 daqiqa" },
  { minutes: 30,    label: "30 daqiqa" },
  { minutes: 60,    label: "1 soat" },
  { minutes: 180,   label: "3 soat" },
  { minutes: 360,   label: "6 soat" },
  { minutes: 720,   label: "12 soat" },
  { minutes: 1440,  label: "1 kun" },
  { minutes: 4320,  label: "3 kun" },
  { minutes: 10080, label: "1 hafta" },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type RightPanel = 'analysis' | 'monitor' | 'blacklist'
type ViolationAction = 'mute' | 'unmute' | 'reset-warns'

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
  const [analysisReasonFilter, setAnalysisReasonFilter] = useState<ReasonFilterValue>("all")

  // Monitor
  const [monitoredChats, setMonitoredChats]         = useState<Set<number>>(new Set())
  const [monitorLoading, setMonitorLoading]         = useState<number | null>(null)
  const [violations, setViolations]                 = useState<ViolationRecord[] | null>(null)
  const [violationsLoading, setViolationsLoading]   = useState(false)
  const [violationAction, setViolationAction]     = useState<{
    userId: number
    action: ViolationAction
  } | null>(null)
  const [mutePresets, setMutePresets] = useState<MutePreset[]>(FALLBACK_MUTE_PRESETS)

  // Tahlil natijalarini reason bo'yicha client-side filtrlash
  const filteredNegative = useMemo(() => {
    if (!analysisResult) return []
    return filterMessagesByReason(analysisResult.negative_messages, analysisReasonFilter)
  }, [analysisResult, analysisReasonFilter])

  // Refs
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Prevents concurrent violations fetches (e.g. tab-switch + auto-fetch racing)
  const violationsInFlight = useRef(false)

  // ── Birinchi guruhni avtomatik tanlash ───────────────────────────────────────
  useEffect(() => {
    if (selectedChat) return
    const first =
      initialChats.find((c) => c.type === "Group") ??
      initialChats.find((c) => c.type === "Channel")
    if (first) setSelectedChat(first)
  }, [initialChats, selectedChat])

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

  // ── On mount: fetch mute duration presets ────────────────────────────────────
  useEffect(() => {
    moderationApi.getMutePresets()
      .then(data => {
        if (Array.isArray(data?.presets) && data.presets.length) {
          setMutePresets(data.presets)
        }
      })
      .catch(() => {})
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
    setAnalysisReasonFilter("all")
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

  const patchViolation = useCallback(
    (userId: number, patch: Partial<ViolationRecord>) => {
      setViolations((prev) =>
        prev?.map((v) => (v.user_id === userId ? { ...v, ...patch } : v)) ?? null,
      )
    },
    [],
  )

  const handleMute = async (chatId: number, userId: number, durationMinutes: number) => {
    setViolationAction({ userId, action: "mute" })
    setError(null)
    try {
      const res = await moderationApi.mute(chatId, userId, durationMinutes)
      patchViolation(userId, {
        is_muted: true,
        muted_until: res.muted_until,
      })
    } catch (err: unknown) {
      setError(await handleError(err))
    } finally {
      setViolationAction(null)
    }
  }

  const handleUnmute = async (chatId: number, userId: number) => {
    setViolationAction({ userId, action: "unmute" })
    setError(null)
    try {
      const res = await moderationApi.unmute(chatId, userId)
      patchViolation(userId, {
        is_muted: res.is_muted,
        muted_until: res.muted_until,
      })
    } catch (err: unknown) {
      setError(await handleError(err))
    } finally {
      setViolationAction(null)
    }
  }

  const handleResetWarns = async (chatId: number, userId: number) => {
    setViolationAction({ userId, action: "reset-warns" })
    setError(null)
    try {
      const res = await moderationApi.resetWarns(chatId, userId)
      patchViolation(userId, {
        warn_count: res.warn_count,
        is_muted: res.is_muted,
        muted_until: res.muted_until,
      })
    } catch (err: unknown) {
      setError(await handleError(err))
    } finally {
      setViolationAction(null)
    }
  }

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

  // ── Guruh tanlash (veb panel) ───────────────────────────────────────────────
  const selectChat = useCallback((chat: Chat) => {
    setSelectedChat(chat)
    setError(null)
    if (rightPanel === "monitor" && !violationsInFlight.current && !violationsLoading) {
      handleFetchViolations(chat.id)
    }
  }, [rightPanel, violationsLoading, handleFetchViolations])

  // ── Derived values ────────────────────────────────────────────────────────────
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const groupChats = filteredChats.filter(
    (c) => c.type === "Group" || c.type === "Channel",
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
            <h1 className="text-2xl font-bold text-foreground">Guruhlar boshqaruvi</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span>{chats.length} ta guruh va kanal</span>
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
            placeholder="Guruhlarni qidirish..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* ── Chap: guruhlar ro'yxati ─────────────────────────────────── */}
          <aside className="w-full lg:w-[min(100%,380px)] shrink-0 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">
              Boshqariladigan guruhlar
            </p>
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden max-h-[min(70vh,640px)] overflow-y-auto">
              {groupChats.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">Guruh topilmadi</p>
                </div>
              ) : (
                groupChats.map((chat) => {
                  const Icon = getChatIcon(chat.type)
                  const isMonitored = monitoredChats.has(chat.id)
                  const isSelected = selectedChat?.id === chat.id

                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => selectChat(chat)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-border/30 last:border-b-0 transition-colors",
                        isSelected
                          ? "bg-primary/10 border-l-2 border-l-primary"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          chat.type === "Group"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-violet-500/10 text-violet-600",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate text-sm">
                          {chat.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          ID: {chat.id}
                        </p>
                      </div>
                      {isMonitored && (
                        <ShieldCheck
                          className="h-4 w-4 shrink-0 text-emerald-500"
                          aria-label="Kuzatilmoqda"
                        />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          {/* ── O'ng: tanlangan guruh + tablar ───────────────────────────── */}
          <main className="flex-1 min-w-0 lg:sticky lg:top-24">

            {!selectedChat ? (
              <div className="rounded-2xl border border-border/50 bg-card p-12 text-center min-h-[420px] flex flex-col items-center justify-center">
                <Users className="h-14 w-14 text-muted-foreground/30" />
                <h2 className="mt-4 text-lg font-semibold text-foreground">
                  Guruhni tanlang
                </h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Chap ro&apos;yxatdan guruhni tanlang. O&apos;ng tomonda tahlil,
                  monitoring va qora ro&apos;yxat bo&apos;limlari ochiladi.
                </p>
              </div>
            ) : (
              <>
            {/* Guruh sarlavhasi + tezkor amallar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {selectedChat.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatChatLabel(selectedChat.id, selectedChat.title)} · {selectedChat.type}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={monitoredChats.has(selectedChat.id) ? "default" : "outline"}
                  onClick={() => handleMonitorToggle(selectedChat)}
                  disabled={monitorLoading === selectedChat.id || analyzing === selectedChat.id}
                  className={cn(
                    monitoredChats.has(selectedChat.id) &&
                      "bg-emerald-600 hover:bg-emerald-700 border-emerald-600",
                  )}
                >
                  {monitorLoading === selectedChat.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {monitoredChats.has(selectedChat.id) ? "Kuzatuvni to'xtatish" : "Monitoring"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setRightPanel("analysis")
                    handleAnalyze(selectedChat)
                  }}
                  disabled={analyzing === selectedChat.id}
                >
                  {analyzing === selectedChat.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Tahlilni boshlash
                </Button>
              </div>
            </div>

            {/* 3 ta tab */}
            {analyzing === null && (
              <div
                role="tablist"
                className="flex rounded-t-xl overflow-hidden border border-border/50 border-b-0 bg-card"
              >
                {(
                  [
                    { id: "analysis" as const, label: "Tahlil", icon: BarChart3 },
                    { id: "monitor" as const, label: "Monitoring", icon: Shield },
                    { id: "blacklist" as const, label: "Qora ro'yxat", icon: ShieldAlert },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={rightPanel === id}
                    onClick={() => {
                      setRightPanel(id)
                      if (id === "monitor" && !violationsInFlight.current && !violationsLoading) {
                        handleFetchViolations(selectedChat.id)
                      }
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                      rightPanel === id
                        ? "bg-primary/10 text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                    {id === "monitor" && monitoredChats.has(selectedChat.id) && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                ))}
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

            /* ── Qora ro'yxat paneli ─────────────────────────────── */
            ) : rightPanel === "blacklist" ? (
                <div
                  className={cn(
                    "border border-border/50 bg-card p-6 rounded-b-xl",
                    analyzing === null && "rounded-tr-xl",
                  )}
                >
                  <BlacklistPanel
                    chatId={selectedChat.id}
                    onError={(msg) => setError(msg)}
                  />
                </div>

            /* ── Analysis results panel ────────────────────────────── */
            ) : rightPanel === "analysis" ? (
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
                    <div className="space-y-3">
                      <AnalysisReasonFilterChips
                        value={analysisReasonFilter}
                        onChange={setAnalysisReasonFilter}
                      />
                      {filteredNegative.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Negativ xabarlar ({filteredNegative.length})
                          </h3>
                          {filteredNegative.map(msg => (
                            <div key={msg.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <ReasonBadge reason={msg.reason} variant="short" />
                                    {formatUserLabel(msg.sender_id, msg.sender_username) && (
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        {formatUserLabel(msg.sender_id, msg.sender_username)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                    {msg.text}
                                  </p>
                                  {formatConfidencePercent(msg.confidence) && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {formatConfidencePercent(msg.confidence)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Tanlangan filtr bo&apos;yicha xabar topilmadi
                        </p>
                      )}
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
                        {violations.map((v, idx) => {
                          const isMuting =
                            violationAction?.userId === v.user_id &&
                            violationAction.action === "mute"
                          const isUnmuting =
                            violationAction?.userId === v.user_id &&
                            violationAction.action === "unmute"
                          const isResetting =
                            violationAction?.userId === v.user_id &&
                            violationAction.action === "reset-warns"
                          const busy = isMuting || isUnmuting || isResetting

                          return (
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
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                  <span className="text-sm font-medium text-foreground">
                                    {v.first_name || (v.username ? `@${v.username}` : "Noma'lum foydalanuvchi")}
                                  </span>
                                  {v.username && v.first_name && (
                                    <span className="text-[11px] text-muted-foreground">@{v.username}</span>
                                  )}
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
                                <p className="text-xs text-muted-foreground font-mono mb-1">
                                  {formatUserLabel(v.user_id, v.username) ?? `User #${v.user_id}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Ogohlantirish:{" "}
                                  <span className="font-medium text-foreground">{v.warn_count}</span>
                                  {v.muted_until && (
                                    <span className="ml-2 opacity-70">
                                      · {new Date(v.muted_until).toLocaleString("uz-UZ")}
                                    </span>
                                  )}
                                </p>
                                {(v.last_reason || v.last_confidence) && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    <ReasonBadge reason={v.last_reason} />
                                    {formatConfidencePercent(v.last_confidence) && (
                                      <span className="text-[11px] text-muted-foreground">
                                        {formatConfidencePercent(v.last_confidence)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0 sm:items-end">
                                {/* Jimlantirish (mute) — jimlantirilMAgan va banlanMAgan uchun */}
                                {!v.is_muted && !v.is_banned && selectedChat && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs border-orange-500/40 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
                                        disabled={busy}
                                      >
                                        {isMuting ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                        ) : (
                                          <VolumeX className="h-3.5 w-3.5 mr-1" />
                                        )}
                                        Jimlantirish
                                        <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                      {mutePresets.map(preset => (
                                        <DropdownMenuItem
                                          key={preset.minutes}
                                          onClick={() => handleMute(selectedChat.id, v.user_id, preset.minutes)}
                                          className="text-xs gap-2 cursor-pointer"
                                        >
                                          <Timer className="h-3.5 w-3.5 text-orange-500" />
                                          {preset.label}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                {/* Cheklovni olish (unmute) — jimlantirilgan uchun */}
                                {v.is_muted && !v.is_banned && selectedChat && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                                    disabled={busy}
                                    onClick={() => handleUnmute(selectedChat.id, v.user_id)}
                                  >
                                    {isUnmuting ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                    ) : (
                                      <Volume2 className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Cheklovni olish
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  disabled={
                                    busy ||
                                    (v.warn_count === 0 && !v.is_muted && !v.muted_until)
                                  }
                                  onClick={() =>
                                    selectedChat && handleResetWarns(selectedChat.id, v.user_id)
                                  }
                                >
                                  {isResetting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                  ) : (
                                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  Ogohlantirishni nolga tushirish
                                </Button>
                              </div>
                            </div>
                          </div>
                          )
                        })}
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
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
