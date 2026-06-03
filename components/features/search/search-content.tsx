"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle, AlertTriangle, Ban, Calendar, Check,
  ChevronDown, ChevronsUpDown, Clock, FileDown,
  Filter, Loader2, Send, ShieldAlert, VolumeX,
} from "lucide-react"
import { Button }       from "@/components/ui/button"
import { Badge }        from "@/components/ui/badge"
import { Switch }       from "@/components/ui/switch"
import { Label }        from "@/components/ui/label"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { AlertMessage } from "@/components/alert-message"
import { cn }           from "@/lib/utils"
import { ApiError, type Chat } from "@/lib/api"
import { useApiError }  from "@/lib/hooks/useApiError"

// ── Types ─────────────────────────────────────────────────────────────────────

type UserStatus  = 'banned' | 'muted' | 'warned' | null
type DetectReason = 'keyword_match' | 'context_weight' | 'ai_sentiment' | null
type DatePreset  = 'today' | 'yesterday' | 'last3days' | 'custom'

interface SearchResult {
  id:          number
  chat_id:     number
  text:        string
  is_negative: boolean
  reason:      DetectReason
  confidence:  number
  sender_id:   number | null
  analyzed_at: string | null
  user_status: UserStatus
  warn_count:  number | null
  muted_until: string | null
}

interface SearchResponse {
  results: SearchResult[]
  count:   number
  query:   string        // date-range label returned by backend e.g. "2026-05-30 – 2026-05-31"
}

interface SearchContentProps {
  initialPhone: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today',     label: 'Bugun'        },
  { value: 'yesterday', label: 'Kecha'        },
  { value: 'last3days', label: 'Oxirgi 3 kun' },
  { value: 'custom',    label: 'Maxsus sana'  },
]

const CHAT_TYPE_LABELS: Record<string, string> = {
  Group: "Guruh", Channel: "Kanal", Private: "Shaxsiy",
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function todayLocal(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000)
}

function getDateRange(preset: DatePreset, custom: string): { start: string; end: string } {
  const today = todayLocal()
  switch (preset) {
    case 'today':
      return { start: toISO(today), end: toISO(addDays(today, 1)) }
    case 'yesterday': {
      const y = addDays(today, -1)
      return { start: toISO(y), end: toISO(today) }
    }
    case 'last3days':
      return { start: toISO(addDays(today, -3)), end: toISO(addDays(today, 1)) }
    case 'custom': {
      if (!custom) return { start: toISO(today), end: toISO(addDays(today, 1)) }
      // Parse local date string "YYYY-MM-DD" avoiding timezone offset issues
      const [y, m, d] = custom.split('-').map(Number)
      const base = new Date(y, m - 1, d)
      return { start: toISO(base), end: toISO(addDays(base, 1)) }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status, warnCount }: { status: UserStatus; warnCount: number | null }) {
  if (status === 'banned') return (
    <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px] h-5 gap-0.5 shrink-0">
      <Ban className="h-3 w-3" />Bloklangan
    </Badge>
  )
  if (status === 'muted') return (
    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] h-5 gap-0.5 shrink-0">
      <VolumeX className="h-3 w-3" />Cheklangan (Mute)
    </Badge>
  )
  if (status === 'warned') return (
    <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px] h-5 gap-0.5 shrink-0">
      <AlertCircle className="h-3 w-3" />Ogohlantirish · {warnCount ?? 0} ta
    </Badge>
  )
  return null
}

function cardBorder(item: SearchResult): string {
  if (item.user_status === 'banned') return "border-red-500/40 bg-red-500/5"
  if (item.user_status === 'muted')  return "border-amber-500/30 bg-amber-500/5"
  if (item.user_status === 'warned') return "border-blue-500/20 bg-blue-500/5"
  if (item.is_negative)              return "border-red-500/20 bg-red-500/5"
  return "border-border/40 bg-card"
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchContent({ initialPhone }: SearchContentProps) {
  const { handleError } = useApiError()

  // Core state
  const [negativeOnly, setNegativeOnly]     = useState(true)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [results, setResults]               = useState<SearchResponse | null>(null)

  // Date picker state
  const [datePreset, setDatePreset]         = useState<DatePreset>('today')
  const [customDate, setCustomDate]         = useState(toISO(todayLocal()))

  // Chat combobox state
  const [chats, setChats]                   = useState<Chat[]>([])
  const [chatsLoading, setChatsLoading]     = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)
  const [comboOpen, setComboOpen]           = useState(false)

  // Report state
  const [sendingReport, setSendingReport]   = useState(false)
  const [reportSentOk, setReportSentOk]     = useState(false)

  // ── Fetch chats on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialPhone) return
    const ctrl = new AbortController()
    setChatsLoading(true)
    fetch('/api/chats', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: initialPhone }), signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data?.chats)) setChats(data.chats) })
      .catch(err => { if (err?.name !== 'AbortError') console.warn('Chatlar yuklanmadi:', err) })
      .finally(() => setChatsLoading(false))
    return () => ctrl.abort()
  }, [initialPhone])

  // ── Search ────────────────────────────────────────────────────────────────────
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    setResults(null)

    const { start, end } = getDateRange(datePreset, customDate)

    try {
      const body: Record<string, unknown> = {
        phone:         String(initialPhone),
        start_date:    start,
        end_date:      end,
        negative_only: Boolean(negativeOnly),
      }
      if (selectedChatId !== null) body.chat_id = selectedChatId

      const res = await fetch('/api/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: res.statusText }))
        throw new ApiError(res.status, errData.detail || res.statusText)
      }
      setResults(await res.json())
    } catch (err: unknown) {
      setError(await handleError(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Report sender ─────────────────────────────────────────────────────────────
  const handleSendReport = async () => {
    if (!results?.results.length || selectedChatId === null) return
    setSendingReport(true)
    setReportSentOk(false)

    const { start, end } = getDateRange(datePreset, customDate)

    try {
      const res = await fetch('/api/report/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: String(initialPhone), chat_id: selectedChatId,
          start_date: start, end_date: end,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: res.statusText }))
        throw new ApiError(res.status, errData.detail)
      }
      const data = await res.json()
      if (data.sent) {
        setReportSentOk(true)
        setTimeout(() => setReportSentOk(false), 4_000)
      }
    } catch (err: unknown) {
      setError(await handleError(err))
    } finally {
      setSendingReport(false)
    }
  }

  // ── CSV export ────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!results?.results.length) return
    const BOM  = '﻿'
    const head = ['Sana va Vaqt', 'Guruh', 'Foydalanuvchi ID', 'Jazo holati',
                  'Aniqlash usuli', 'Ishonch (%)', 'Xabar matni']

    const rows = results.results.map(item => {
      const chat   = chats.find(c => c.id === item.chat_id)?.title ?? `Chat ${item.chat_id}`
      const date   = item.analyzed_at ? new Date(item.analyzed_at).toLocaleString('uz-UZ') : '—'
      const status = item.user_status === 'banned'  ? 'Bloklangan' :
                     item.user_status === 'muted'   ? 'Cheklangan (Mute)' :
                     item.user_status === 'warned'  ? `Ogohlantirish (${item.warn_count ?? 0})` : '—'
      const method = item.reason === 'keyword_match'  ? "Lug'at (L1)"   :
                     item.reason === 'context_weight' ? 'Kontekst (L2)' :
                     item.reason === 'ai_sentiment'   ? 'AI (L3)'       : '—'
      const conf   = item.confidence > 0 ? (item.confidence * 100).toFixed(1) : '—'
      const text   = `"${item.text.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
      return [date, chat, item.sender_id ?? '—', status, method, conf, text].join(',')
    })

    const csv  = BOM + [head.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `xavfsizlik-jurnali-${results.query.replace(' – ', '_')}.csv`,
    })
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedChat = chats.find(c => c.id === selectedChatId) ?? null

  const stats = results ? {
    banned:  results.results.filter(r => r.user_status === 'banned').length,
    muted:   results.results.filter(r => r.user_status === 'muted').length,
    warned:  results.results.filter(r => r.user_status === 'warned').length,
  } : null

  const canSendReport = Boolean(results?.results.length && selectedChatId !== null)

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <ShieldAlert className="h-6 w-6 text-red-500 shrink-0" />
            <h1 className="text-2xl font-bold text-foreground">Xavfsizlik Jurnali</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                             bg-red-500/10 text-red-600 border border-red-500/20 shrink-0">
              Security Audit Log
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Tizim tomonidan aniqlangan va o&apos;chirilgan qoidabuzarliklar xronologiyasi
          </p>
        </div>

        {/* ── Filter form ─────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSearch}
          className="rounded-2xl border border-border/40 bg-card p-5 mb-6 space-y-3"
        >
          {/* ── Date preset selector ──────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />Hisobot sanasi
            </p>
            <div className="flex rounded-xl border border-border/60 overflow-hidden w-fit">
              {DATE_PRESETS.map((p, i) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setDatePreset(p.value)}
                  className={cn(
                    "h-9 px-4 text-sm font-medium transition-colors",
                    i > 0 && "border-l border-border/60",
                    datePreset === p.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date input */}
            {datePreset === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                max={toISO(todayLocal())}
                className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm
                           text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}
          </div>

          {/* ── Filters row ───────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Chat combobox */}
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button" variant="outline" role="combobox"
                  aria-expanded={comboOpen}
                  className="h-10 flex-1 min-w-[170px] justify-between px-3 text-sm font-normal"
                >
                  <span className="truncate flex-1 text-left">
                    {selectedChat
                      ? <span className="font-medium text-foreground">{selectedChat.title}</span>
                      : <span className="text-muted-foreground">Barcha guruhlar bo&apos;yicha</span>}
                  </span>
                  {chatsLoading
                    ? <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                    : <ChevronsUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[300px]" align="start" sideOffset={6}>
                <Command>
                  <CommandInput placeholder="Guruh nomi bo'yicha qidirish..." />
                  <CommandList>
                    <CommandEmpty>
                      {chatsLoading ? "Guruhlar yuklanmoqda..." : "Guruh topilmadi"}
                    </CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="barcha guruhlar boyicha"
                        onSelect={() => { setSelectedChatId(null); setComboOpen(false) }}
                        className="gap-2 cursor-pointer"
                      >
                        <Check className={cn("h-4 w-4 shrink-0 text-primary",
                          selectedChatId === null ? "opacity-100" : "opacity-0")} />
                        <span className="font-medium">Barcha guruhlar bo&apos;yicha</span>
                      </CommandItem>
                      {chats.map(chat => (
                        <CommandItem
                          key={chat.id} value={chat.title}
                          onSelect={() => {
                            setSelectedChatId(selectedChatId === chat.id ? null : chat.id)
                            setComboOpen(false)
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          <Check className={cn("h-4 w-4 shrink-0 text-primary",
                            selectedChatId === chat.id ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1 truncate">{chat.title}</span>
                          <span className="text-[11px] text-muted-foreground shrink-0 ml-1">
                            {CHAT_TYPE_LABELS[chat.type] ?? chat.type}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Faqat o'chirilganlar switch — NO onClick on wrapper */}
            <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border/40
                            bg-background shrink-0">
              <Switch
                id="negative-only"
                checked={negativeOnly}
                onCheckedChange={setNegativeOnly}
              />
              <Label
                htmlFor="negative-only"
                className="text-sm text-muted-foreground cursor-pointer select-none whitespace-nowrap"
              >
                Faqat o&apos;chirilganlar
              </Label>
            </div>

            {/* Search button */}
            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-6 gap-2 shrink-0 min-w-[120px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              <span>{loading ? "Yuklanmoqda..." : "Ko'rsatish"}</span>
            </Button>
          </div>

          {/* Active chat filter hint */}
          {selectedChat && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pl-0.5">
              <Filter className="h-3 w-3" />
              Faqat{" "}
              <span className="font-medium text-foreground">{selectedChat.title}</span>{" "}
              guruhida
              <button type="button" onClick={() => setSelectedChatId(null)}
                className="text-primary hover:underline ml-1">
                Bekor qilish
              </button>
            </p>
          )}
        </form>

        {error && (
          <AlertMessage type="error" message={error} onClose={() => setError(null)} className="mb-6" />
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {results && (
          <div>
            {/* Results header */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{results.count}</span> ta incident
                  {" · "}
                  <span className="font-medium text-foreground font-mono">{results.query}</span>
                  {selectedChat && <> · {selectedChat.title}</>}
                </span>

                {/* Status mini-badges */}
                {stats && stats.banned > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold
                                   px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                    <Ban className="h-2.5 w-2.5" />{stats.banned} bloklangan
                  </span>
                )}
                {stats && stats.muted > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold
                                   px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    <VolumeX className="h-2.5 w-2.5" />{stats.muted} cheklangan
                  </span>
                )}
                {stats && stats.warned > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold
                                   px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    <AlertCircle className="h-2.5 w-2.5" />{stats.warned} ogohlantirish
                  </span>
                )}
              </div>

              {/* Action buttons */}
              {results.results.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  {/* CSV */}
                  <Button type="button" variant="outline" size="sm"
                    onClick={handleExportCSV} className="h-8 gap-1.5 text-xs">
                    <FileDown className="h-3.5 w-3.5" />CSV
                  </Button>

                  {/* Send report — only active when a specific chat is selected */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendReport}
                    disabled={sendingReport || !canSendReport}
                    title={!canSendReport ? "Guruh tanlang" : "Hisobotni Saqlangan Xabarlarimga yuborish"}
                    className={cn(
                      "h-8 gap-1.5 text-xs",
                      reportSentOk && "text-emerald-600 border-emerald-500/40 bg-emerald-500/5"
                    )}
                  >
                    {sendingReport ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : reportSentOk ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {reportSentOk ? "Yuborildi!" : "Adminga yuborish"}
                  </Button>
                </div>
              )}
            </div>

            {/* No results */}
            {results.results.length === 0 ? (
              <div className="rounded-2xl border border-border/40 bg-card p-12 text-center">
                <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 font-medium text-foreground">Incidentlar topilmadi</p>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                  {results.query} uchun qoidabuzarliklar qayd etilmagan.
                  Monitoring yoqilganda xabarlar avtomatik saqlanadi.
                </p>
              </div>
            ) : (
              /* Incident log */
              <div className="space-y-2.5">
                {results.results.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className={cn("rounded-xl border p-4 transition-colors", cardBorder(item))}
                  >
                    {/* Header: timestamp + chat + user + violation badge */}
                    <div className="flex items-start justify-between gap-2 mb-2.5 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="font-mono">
                          {item.analyzed_at
                            ? new Date(item.analyzed_at).toLocaleString('uz-UZ')
                            : '—'}
                        </span>
                        <span className="opacity-40">·</span>
                        <span className="font-medium text-foreground">
                          {chats.find(c => c.id === item.chat_id)?.title ?? `Chat ${item.chat_id}`}
                        </span>
                        {item.sender_id && (
                          <>
                            <span className="opacity-40">·</span>
                            <span className="font-mono">User #{item.sender_id}</span>
                          </>
                        )}
                      </div>
                      <StatusBadge status={item.user_status} warnCount={item.warn_count} />
                    </div>

                    {/* Message text */}
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words flex-1 leading-relaxed">
                        {item.text}
                      </p>
                    </div>

                    {/* Footer: detection method + confidence + mute-until */}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      {item.reason === 'keyword_match' && (
                        <Badge variant="secondary"
                          className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                          Lug&apos;at (L1)
                        </Badge>
                      )}
                      {item.reason === 'context_weight' && (
                        <Badge variant="secondary"
                          className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]">
                          Kontekst (L2)
                        </Badge>
                      )}
                      {item.reason === 'ai_sentiment' && (
                        <Badge variant="secondary"
                          className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-[10px]">
                          AI (L3)
                        </Badge>
                      )}
                      {item.reason === 'ai_sentiment' && item.confidence > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Ishonch: {(item.confidence * 100).toFixed(1)}%
                        </span>
                      )}
                      {item.user_status === 'muted' && item.muted_until && (
                        <span className="text-xs text-amber-600 ml-auto">
                          Mute tugashi: {new Date(item.muted_until).toLocaleString('uz-UZ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
