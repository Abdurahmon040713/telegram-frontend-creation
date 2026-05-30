"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle, Check, ChevronDown, ChevronsUpDown,
  Filter, Loader2, Search,
} from "lucide-react"
import { Button }       from "@/components/ui/button"
import { Input }        from "@/components/ui/input"
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

interface SearchResult {
  id:          number
  chat_id:     number
  text:        string
  is_negative: boolean
  reason:      'keyword_match' | 'ai_sentiment' | null
  confidence:  number
  sender_id:   number | null
  analyzed_at: string | null
}

interface SearchResponse {
  results: SearchResult[]
  count:   number
  query:   string
}

interface SearchContentProps {
  initialPhone: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LIMIT_OPTIONS = [
  { value: 20,  label: "20 ta natija"  },
  { value: 50,  label: "50 ta natija"  },
  { value: 100, label: "100 ta natija" },
]

const CHAT_TYPE_LABELS: Record<string, string> = {
  Group:   "Guruh",
  Channel: "Kanal",
  Private: "Shaxsiy",
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchContent({ initialPhone }: SearchContentProps) {
  const { handleError } = useApiError()

  // Search form state
  const [query, setQuery]               = useState("")
  const [negativeOnly, setNegativeOnly] = useState(true)
  const [limit, setLimit]               = useState(50)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [results, setResults]           = useState<SearchResponse | null>(null)

  // Chat combobox state
  const [chats, setChats]               = useState<Chat[]>([])
  const [chatsLoading, setChatsLoading] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)
  const [comboOpen, setComboOpen]       = useState(false)

  // ── Fetch user's chats on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!initialPhone) return
    const controller = new AbortController()
    setChatsLoading(true)
    fetch('/api/chats', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: initialPhone }),
      signal:  controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data?.chats)) setChats(data.chats)
      })
      .catch(err => {
        if (err?.name !== 'AbortError') console.warn('Chatlar yuklanmadi:', err)
      })
      .finally(() => setChatsLoading(false))
    return () => controller.abort()
  }, [initialPhone])

  // ── Search handler ────────────────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      // Explicit typed body — no implicit coercion, clear for backend Zod schema.
      // chat_id is a 64-bit Telegram integer (large negative for supergroups).
      // Omit it entirely when no chat is selected so the backend searches globally.
      const body: {
        phone:         string
        query:         string
        negative_only: boolean
        limit:         number
        chat_id?:      number
      } = {
        phone:         String(initialPhone),
        query:         trimmed,
        negative_only: Boolean(negativeOnly),
        limit:         Number(limit),
      }
      if (typeof selectedChatId === 'number' && Number.isFinite(selectedChatId)) {
        body.chat_id = selectedChatId
      }

      const res = await fetch('/api/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
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

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedChat = chats.find(c => c.id === selectedChatId) ?? null

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Xabar qidiruvi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ilgari tahlil qilingan xabarlar orasidan qidiring
          </p>
        </div>

        {/* ── Search form ─────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSearch}
          className="rounded-2xl border border-border/40 bg-card p-5 mb-6 space-y-3"
        >
          {/* Row 1 — keyword input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Kalit so'z kiriting (kamida 2 belgi)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-10 h-11"
              minLength={2}
              autoComplete="off"
            />
          </div>

          {/* Row 2 — filters, all h-10, single flex line */}
          <div className="flex flex-wrap items-center gap-2">

            {/* ── Limit dropdown ──────────────────────────────────────────── */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-1.5 px-3 text-sm shrink-0"
                >
                  {LIMIT_OPTIONS.find(o => o.value === limit)?.label ?? `${limit} ta`}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
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

            {/* ── Chat combobox ───────────────────────────────────────────── */}
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="h-10 flex-1 min-w-[170px] justify-between px-3 text-sm font-normal"
                >
                  <span className="truncate flex-1 text-left">
                    {selectedChat ? (
                      <span className="font-medium text-foreground">
                        {selectedChat.title}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Barcha chatlar bo&apos;yicha
                      </span>
                    )}
                  </span>
                  {chatsLoading ? (
                    <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </Button>
              </PopoverTrigger>

              <PopoverContent className="p-0 w-[300px]" align="start" sideOffset={6}>
                <Command>
                  <CommandInput placeholder="Chat nomi bo'yicha qidiring..." />
                  <CommandList>
                    <CommandEmpty>
                      {chatsLoading
                        ? "Chatlar yuklanmoqda..."
                        : "Chat topilmadi"}
                    </CommandEmpty>

                    <CommandGroup>
                      {/* "All chats" option */}
                      <CommandItem
                        value="barcha chatlar boyicha"
                        onSelect={() => {
                          setSelectedChatId(null)
                          setComboOpen(false)
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <Check className={cn(
                          "h-4 w-4 shrink-0 text-primary",
                          selectedChatId === null ? "opacity-100" : "opacity-0"
                        )} />
                        <span className="font-medium">Barcha chatlar bo&apos;yicha</span>
                      </CommandItem>

                      {/* Real chat list */}
                      {chats.map(chat => (
                        <CommandItem
                          key={chat.id}
                          value={chat.title}
                          onSelect={() => {
                            setSelectedChatId(
                              selectedChatId === chat.id ? null : chat.id
                            )
                            setComboOpen(false)
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          <Check className={cn(
                            "h-4 w-4 shrink-0 text-primary",
                            selectedChatId === chat.id ? "opacity-100" : "opacity-0"
                          )} />
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

            {/* ── "Faqat negativ" switch ──────────────────────────────────── */}
            {/* NO onClick on wrapper — it would double-fire with onCheckedChange
                and cause "Maximum update depth exceeded".  The Label's htmlFor
                already forwards clicks to the Switch via HTML semantics. */}
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
                Faqat negativ
              </Label>
            </div>

            {/* ── Search button ───────────────────────────────────────────── */}
            <Button
              type="submit"
              disabled={loading || query.trim().length < 2}
              className="h-10 px-6 gap-2 shrink-0 min-w-[130px] sm:w-auto w-full"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Search className="h-4 w-4" />
              }
              <span>{loading ? "Qidirilmoqda..." : "Qidirish"}</span>
            </Button>
          </div>

          {/* Active filter hint */}
          {selectedChat && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pl-0.5">
              <Filter className="h-3 w-3" />
              Faqat{" "}
              <span className="font-medium text-foreground">{selectedChat.title}</span>{" "}
              chatida qidiriladi
              <button
                type="button"
                onClick={() => setSelectedChatId(null)}
                className="text-primary hover:underline ml-1"
              >
                Bekor qilish
              </button>
            </p>
          )}
        </form>

        {error && (
          <AlertMessage
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {results && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{results.count}</span> ta natija
                topildi —{" "}
                <span className="font-medium text-foreground">
                  &quot;{results.query}&quot;
                </span>
                {selectedChat && (
                  <span> · {selectedChat.title}</span>
                )}
              </span>
            </div>

            {results.results.length === 0 ? (
              <div className="rounded-2xl border border-border/40 bg-card p-12 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-muted-foreground">
                  Hech narsa topilmadi. Boshqa kalit so&apos;z kiriting yoki avval chatni tahlil qiling.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.results.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className={cn(
                      "rounded-xl border p-4",
                      item.is_negative
                        ? "border-red-500/20 bg-red-500/5"
                        : "border-border/40 bg-card"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {item.is_negative && (
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {item.reason === 'keyword_match' && (
                            <Badge variant="secondary"
                              className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                              Lug&apos;at
                            </Badge>
                          )}
                          {item.reason === 'ai_sentiment' && (
                            <Badge variant="secondary"
                              className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                              AI Tahlili
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {chats.find(c => c.id === item.chat_id)?.title ?? `Chat ${item.chat_id}`}
                          </span>
                          {item.analyzed_at && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.analyzed_at).toLocaleDateString('uz-UZ')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                          {item.text}
                        </p>
                        {item.reason === 'ai_sentiment' && item.confidence > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Ishonch: {(item.confidence * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
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
