"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertTriangle, Ban, ChevronDown, Loader2, MessageSquare,
  Radio, RefreshCw, RotateCcw, Search, Shield, ShieldCheck,
  Timer, Users, Volume2, VolumeX,
} from "lucide-react"
import { Button }       from "@/components/ui/button"
import { Input }        from "@/components/ui/input"
import { Badge }        from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertMessage } from "@/components/alert-message"
import {
  chatsApi, ApiError, moderationApi,
  type Chat, type ViolationRecord, type MutePreset,
} from "@/lib/api"
import { cn }           from "@/lib/utils"
import { useApiError }  from "@/lib/hooks/useApiError"

// ── Constants ─────────────────────────────────────────────────────────────────

const FALLBACK_MUTE_PRESETS: MutePreset[] = [
  { minutes: 5,    label: "5 daqiqa" },
  { minutes: 15,   label: "15 daqiqa" },
  { minutes: 30,   label: "30 daqiqa" },
  { minutes: 60,   label: "1 soat" },
  { minutes: 180,  label: "3 soat" },
  { minutes: 360,  label: "6 soat" },
  { minutes: 720,  label: "12 soat" },
  { minutes: 1440, label: "1 kun" },
  { minutes: 4320, label: "3 kun" },
  { minutes: 10080, label: "1 hafta" },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type ViolationAction = "mute" | "unmute" | "reset-warns"

interface MonitorContentProps {
  initialChats: Chat[]
  initialPhone: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MonitorContent({ initialChats, initialPhone }: MonitorContentProps) {
  const { handleError } = useApiError()

  const [chats, setChats]             = useState<Chat[]>(initialChats)
  const [loading, setLoading]         = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError]             = useState<string | null>(null)
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)

  const [monitoredChats, setMonitoredChats]       = useState<Set<number>>(new Set())
  const [monitorLoading, setMonitorLoading]       = useState<number | null>(null)
  const [violations, setViolations]               = useState<ViolationRecord[] | null>(null)
  const [violationsLoading, setViolationsLoading] = useState(false)
  const [violationAction, setViolationAction] = useState<{
    userId: number
    action: ViolationAction
  } | null>(null)
  const [mutePresets, setMutePresets] = useState<MutePreset[]>(FALLBACK_MUTE_PRESETS)

  const violationsInFlight = useRef(false)

  // ── Fetch active monitors on mount ───────────────────────────────────────────
  useEffect(() => {
    fetch('/api/monitor/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data?.monitored_chats) && data.monitored_chats.length) {
          setMonitoredChats(new Set(data.monitored_chats as number[]))
        }
      })
      .catch(() => {})
  }, [])

  // ── Fetch mute presets on mount ─────────────────────────────────────────────
  useEffect(() => {
    moderationApi.getMutePresets()
      .then(data => {
        if (Array.isArray(data?.presets) && data.presets.length) {
          setMutePresets(data.presets)
        }
      })
      .catch(() => {})
  }, [])

  // ── Violations fetch ──────────────────────────────────────────────────────────
  const handleFetchViolations = useCallback(async (chatId: number) => {
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
      patchViolation(userId, { is_muted: true, muted_until: res.muted_until })
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
      patchViolation(userId, { is_muted: res.is_muted, muted_until: res.muted_until })
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

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat)
    setError(null)
    if (!violationsInFlight.current && !violationsLoading) {
      handleFetchViolations(chat.id)
    }
  }

  // ── Monitor toggle ────────────────────────────────────────────────────────────
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
      if (!isActive) {
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

  // ── Chat list refresh ─────────────────────────────────────────────────────────
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
              <h1 className="text-2xl font-bold text-foreground">Chatlar nazorati</h1>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full
                               bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operativ
              </span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>{chats.length} ta chat</span>
              {monitoredChats.size > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {monitoredChats.size} ta jonli kuzatilmoqda
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Yangilash
          </Button>
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

          {/* ── Chat list (Shield only) ──────────────────────────────────── */}
          <div className="space-y-2">
            {filteredChats.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
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
                    role="button"
                    tabIndex={0}
                    onClick={() => selectChat(chat)}
                    onKeyDown={(e) => e.key === "Enter" && selectChat(chat)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 transition-all cursor-pointer",
                      isSelected && "border-emerald-500/30 bg-emerald-500/5",
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

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-foreground truncate">{chat.title}</p>
                        {isMonitored && (
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{chat.type}</p>
                    </div>

                    {/* Shield toggle — only button, no Tahlil */}
                    <Button
                      size="sm"
                      variant={isMonitored ? "default" : "outline"}
                      onClick={(e) => { e.stopPropagation(); handleMonitorToggle(chat) }}
                      disabled={monitorLoading === chat.id}
                      className={cn(
                        "shrink-0 gap-1.5 px-3 min-w-[96px]",
                        isMonitored && "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                      )}
                    >
                      {monitorLoading === chat.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isMonitored ? (
                        <><ShieldCheck className="h-4 w-4" /> Faol</>
                      ) : (
                        <><Shield className="h-4 w-4" /> Yoqish</>
                      )}
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          {/* ── Right panel: monitoring only ────────────────────────────── */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-0">
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">

              {!selectedChat ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Shield className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-foreground">Monitoring paneli</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                    Guruhni jonli kuzatuvga olish uchun{" "}
                    <span className="font-medium text-emerald-600">"Yoqish"</span>{" "}
                    tugmasini bosing
                  </p>
                </div>
              ) : (
                <>
                  {/* Panel header */}
                  <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{selectedChat.title}</p>
                      {monitoredChats.has(selectedChat.id) ? (
                        <p className="flex items-center gap-1.5 text-xs text-emerald-500 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Jonli kuzatilmoqda
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">Kuzatuv nofaol</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => handleFetchViolations(selectedChat.id)}
                        disabled={violationsLoading}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-1", violationsLoading && "animate-spin")} />
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
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : monitoredChats.has(selectedChat.id) ? (
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <Shield className="h-3.5 w-3.5 mr-1" />
                        )}
                        {monitoredChats.has(selectedChat.id) ? "To'xtatish" : "Boshlash"}
                      </Button>
                    </div>
                  </div>

                  {/* Violations body */}
                  <div className="p-5">
                    {violationsLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        <p className="mt-2 text-sm text-muted-foreground">Yuklanmoqda...</p>
                      </div>
                    ) : violations && violations.length > 0 ? (
                      <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          {violations.length} ta qoidabuzarlik yozuvi
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
                              v.is_banned   ? "border-red-500/30 bg-red-500/5"
                              : v.is_muted   ? "border-amber-500/30 bg-amber-500/5"
                              : "border-border/40 bg-muted/20"
                            )}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <span className="text-sm font-mono">User #{v.user_id}</span>
                                  {v.is_banned && (
                                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] h-5">
                                      <Ban className="h-3 w-3 mr-0.5" />Bloklangan
                                    </Badge>
                                  )}
                                  {v.is_muted && !v.is_banned && (
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] h-5">
                                      Jimtirilgan
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Ogohlantirish:{" "}
                                  <span className="font-semibold text-foreground">{v.warn_count}</span>
                                  {v.muted_until && (
                                    <span className="ml-2 opacity-60">
                                      · {new Date(v.muted_until).toLocaleString("uz-UZ")}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0 sm:items-end">
                                {/* Jimlantirish (mute) — faqat jimlantirilMAgan va banlanMAgan uchun */}
                                {!v.is_muted && !v.is_banned && selectedChat && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs border-orange-500/40 text-orange-600 hover:bg-orange-500/10"
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
                                          className="text-xs gap-2"
                                        >
                                          <Timer className="h-3.5 w-3.5 text-orange-500" />
                                          {preset.label}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                {/* Cheklovni olish (unmute) — faqat jimlantirilgan uchun */}
                                {v.is_muted && !v.is_banned && selectedChat && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
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
                                {/* Ogohlantirishni nolga tushirish */}
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
                      <div className="text-center py-8">
                        <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/40" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Qoidabuzarliklarni ko&apos;rish uchun &quot;Yangilash&quot; ni bosing
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
