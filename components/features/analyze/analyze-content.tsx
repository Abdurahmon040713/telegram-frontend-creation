"use client"

import { useMemo, useRef, useState } from "react"
import {
  AlertTriangle, BarChart3, ChevronDown, Clock,
  Loader2, MessageSquare, Radio, Search, Users,
} from "lucide-react"
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"
import { Button }        from "@/components/ui/button"
import { Input }         from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertMessage }  from "@/components/alert-message"
import { chatsApi, ApiError, type Chat, type AnalyzeResponse } from "@/lib/api"
import { cn }            from "@/lib/utils"
import { useApiError }   from "@/lib/hooks/useApiError"
import {
  AnalysisReasonFilterChips,
  ReasonBadge,
  formatConfidencePercent,
  filterMessagesByReason,
  type ReasonFilterValue,
} from "@/components/features/chats/analysis-filters"
import { formatUserLabel } from "@/lib/format-user-label"

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

const PIE_COLORS = { clean: "#10b981", negative: "#ef4444" }

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalyzeContentProps {
  initialChats: Chat[]
  initialPhone: string
}

// ── Custom Recharts tooltip ───────────────────────────────────────────────────

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { fill: string } }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-xl border border-border/40 bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium mb-0.5" style={{ color: p.payload.fill }}>{p.name}</p>
      <p className="text-foreground tabular-nums">{p.value.toLocaleString()} ta xabar</p>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AnalyzeContent({ initialChats, initialPhone }: AnalyzeContentProps) {
  const { handleError } = useApiError()

  const [chats, setChats]             = useState<Chat[]>(initialChats)
  const [loading, setLoading]         = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError]             = useState<string | null>(null)
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)

  const [analyzing, setAnalyzing]           = useState<number | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null)
  const [limit, setLimit]                   = useState(50)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [analysisReasonFilter, setAnalysisReasonFilter] = useState<ReasonFilterValue>("all")

  const filteredNegative = useMemo(() => {
    if (!analysisResult) return []
    return filterMessagesByReason(analysisResult.negative_messages, analysisReasonFilter)
  }, [analysisResult, analysisReasonFilter])

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Timer ─────────────────────────────────────────────────────────────────────
  const startTimer = () => {
    setElapsedSeconds(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1_000)
  }
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  // ── Analyze ───────────────────────────────────────────────────────────────────
  const handleAnalyze = async (chat: Chat) => {
    if (!initialPhone) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setAnalyzing(chat.id)
    setSelectedChat(chat)
    setError(null)
    setAnalysisResult(null)
    setAnalysisReasonFilter("all")
    startTimer()

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

      if (startData.status === 'done' && startData.result) {
        setAnalysisResult(startData.result as AnalyzeResponse)
        return
      }

      const deadline = Date.now() + POLL_TIMEOUT_MS
      while (Date.now() < deadline) {
        if (controller.signal.aborted) return
        await new Promise<void>(r => setTimeout(r, POLL_INTERVAL_MS))
        if (controller.signal.aborted) return

        const statusRes = await fetch(`/api/analyze/status/${job_id}`, { signal: controller.signal })
        if (!statusRes.ok) {
          const errData = await statusRes.json().catch(() => ({ detail: statusRes.statusText }))
          throw new ApiError(statusRes.status, errData.detail || statusRes.statusText)
        }
        const s = await statusRes.json()
        if (s.status === 'done')  { setAnalysisResult(s.result as AnalyzeResponse); return }
        if (s.status === 'error') throw new Error(s.error || "Tahlil xatoligi")
      }
      throw new Error("Tahlil juda uzoq davom etdi. Keyinroq qayta urining.")
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(await handleError(err))
    } finally {
      setAnalyzing(null)
      abortRef.current = null
      stopTimer()
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await chatsApi.getChats(initialPhone)
      setChats(data.chats)
    } catch (err: unknown) {
      setError(await handleError(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Derived data for charts ───────────────────────────────────────────────────

  const pieData = analysisResult
    ? [
        {
          name:  "Sof xabarlar",
          value: Math.max(0, analysisResult.analyzed_count - analysisResult.negative_count),
          fill:  PIE_COLORS.clean,
        },
        {
          name:  "Negativ xabarlar",
          value: analysisResult.negative_count,
          fill:  PIE_COLORS.negative,
        },
      ].filter(d => d.value > 0)
    : []

  // Top offenders grouped by sender_id
  const offenderMap = new Map<number, { count: number; username?: string | null }>()
  analysisResult?.negative_messages.forEach(msg => {
    if (msg.sender_id) {
      const prev = offenderMap.get(msg.sender_id)
      offenderMap.set(msg.sender_id, {
        count: (prev?.count ?? 0) + 1,
        username: msg.sender_username ?? prev?.username,
      })
    }
  })
  const topOffenders = [...offenderMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)

  const negPct = analysisResult && analysisResult.analyzed_count > 0
    ? ((analysisResult.negative_count / analysisResult.analyzed_count) * 100).toFixed(1)
    : "0.0"

  const filteredChats = chats.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getChatIcon = (type: string) => {
    if (type === "Group")   return Users
    if (type === "Channel") return Radio
    return MessageSquare
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-foreground">AI Analitika va Statistika</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full
                               bg-violet-500/10 text-violet-600 border border-violet-500/20">
                XLM-RoBERTa
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Guruhni tanlab AI tahlilini ishga tushiring — natijalar grafik ko'rinishda aks etadi
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
                <DropdownMenuRadioGroup value={String(limit)} onValueChange={v => setLimit(Number(v))}>
                  {LIMIT_OPTIONS.map(o => (
                    <DropdownMenuRadioItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              Yangilash
            </Button>
          </div>
        </div>

        {error && (
          <AlertMessage type="error" message={error} onClose={() => setError(null)} className="mb-6" />
        )}

        {/* ── Search ──────────────────────────────────────────────────────── */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Chatlarni qidirish..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── Chat list (Tahlil only — no Shield) ─────────────────────── */}
          <div className="space-y-2">
            {filteredChats.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-muted-foreground">Chat topilmadi</p>
              </div>
            ) : (
              filteredChats.map(chat => {
                const Icon       = getChatIcon(chat.type)
                const isSelected = selectedChat?.id === chat.id
                return (
                  <div
                    key={chat.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 transition-all",
                      isSelected && "border-violet-500/30 bg-violet-500/5",
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                      chat.type === "Group"   ? "bg-emerald-500/10 text-emerald-500"
                      : chat.type === "Channel" ? "bg-violet-500/10 text-violet-500"
                      : "bg-sky-500/10 text-sky-500",
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Title — no ShieldCheck indicator */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{chat.title}</p>
                      <p className="text-xs text-muted-foreground">{chat.type}</p>
                    </div>

                    {/* Tahlil only — no Shield button */}
                    <Button
                      size="sm"
                      onClick={() => handleAnalyze(chat)}
                      disabled={analyzing === chat.id}
                      className="shrink-0 gap-1.5"
                    >
                      {analyzing === chat.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><BarChart3 className="h-4 w-4" /> Tahlil</>
                      )}
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          {/* ── Right panel: analysis + charts ──────────────────────────── */}
          <div className="lg:sticky lg:top-24 lg:self-start">

            {/* Analyzing spinner */}
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
                <p className="mt-1 text-xs text-muted-foreground">
                  AI modeli {limit} ta xabarni tekshirmoqda
                </p>
                <Button
                  variant="ghost" size="sm"
                  className="mt-4 text-muted-foreground"
                  onClick={() => { abortRef.current?.abort(); setAnalyzing(null); stopTimer() }}
                >
                  Bekor qilish
                </Button>
              </div>

            ) : analysisResult && selectedChat ? (
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">

                {/* ── Stats cards ──────────────────────────────────────── */}
                <div className="px-5 pt-5 pb-4 border-b border-border/40">
                  <h2 className="text-sm font-semibold text-foreground mb-3">
                    {selectedChat.title}
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-muted/40 p-3 text-center">
                      <p className="text-2xl font-bold tabular-nums text-foreground">
                        {analysisResult.analyzed_count}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Tahlil qilindi</p>
                    </div>
                    <div className="rounded-xl bg-red-500/10 p-3 text-center">
                      <p className="text-2xl font-bold tabular-nums text-red-500">
                        {analysisResult.negative_count}
                      </p>
                      <p className="text-[11px] text-red-400 mt-0.5">Negativ</p>
                    </div>
                    <div className="rounded-xl bg-violet-500/10 p-3 text-center">
                      <p className="text-2xl font-bold tabular-nums text-violet-500">
                        {negPct}%
                      </p>
                      <p className="text-[11px] text-violet-400 mt-0.5">Nisbat</p>
                    </div>
                  </div>
                </div>

                {/* ── Donut chart ──────────────────────────────────────── */}
                {pieData.length > 0 && (
                  <div className="px-5 py-4 border-b border-border/40">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Taqsimot grafigi
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => (
                            <span className="text-xs text-muted-foreground">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ── Top offenders ────────────────────────────────────── */}
                {topOffenders.length > 0 && (
                  <div className="px-5 py-4 border-b border-border/40">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Eng faol qoidabuzarlar
                    </p>
                    <div className="space-y-2">
                      {topOffenders.map(([userId, entry], idx) => {
                        const pct = Math.round((entry.count / analysisResult.negative_count) * 100)
                        return (
                          <div key={userId} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-4 tabular-nums">
                              {idx + 1}.
                            </span>
                            <span className="text-sm font-mono flex-1">
                              {formatUserLabel(userId, entry.username)}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 rounded-full bg-red-500/20 w-20 overflow-hidden">
                                <div
                                  className="h-full bg-red-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                                {entry.count} ta
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Negative messages list ───────────────────────────── */}
                <div className="px-5 py-4">
                  {analysisResult.negative_messages.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                        <MessageSquare className="h-6 w-6 text-emerald-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Negativ xabarlar aniqlanmadi — guruh toza!
                      </p>
                    </div>
                  ) : (
                    <div>
                      <AnalysisReasonFilterChips
                        value={analysisReasonFilter}
                        onChange={setAnalysisReasonFilter}
                        className="mb-3"
                      />
                      {filteredNegative.length > 0 ? (
                        <>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Negativ xabarlar ro&apos;yxati ({filteredNegative.length})
                          </p>
                          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                            {filteredNegative.map(msg => (
                              <div
                                key={msg.id}
                                className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                              >
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                      <ReasonBadge reason={msg.reason} variant="short" />
                                      {formatUserLabel(msg.sender_id, msg.sender_username) && (
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          {formatUserLabel(msg.sender_id, msg.sender_username)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-snug">
                                      {msg.text}
                                    </p>
                                    {formatConfidencePercent(msg.confidence) && (
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        {formatConfidencePercent(msg.confidence)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Tanlangan filtr bo&apos;yicha xabar topilmadi
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

            ) : (
              /* Empty state */
              <div className="rounded-2xl border border-border/40 bg-card p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
                  <BarChart3 className="h-8 w-8 text-violet-500" />
                </div>
                <h3 className="font-semibold text-foreground">AI Tahlil paneli</h3>
                <p className="mt-1.5 text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                  Guruhni tanlang va{" "}
                  <span className="font-medium text-violet-600">"Tahlil"</span>{" "}
                  tugmasini bosing — natijalar grafik shaklida ko&apos;rinadi
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
