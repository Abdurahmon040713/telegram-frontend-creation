"use client"

import { useState } from "react"
import { Search, AlertTriangle, Loader2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertMessage } from "@/components/alert-message"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { useApiError } from "@/lib/hooks/useApiError"

interface SearchResult {
  id: number
  chat_id: number
  text: string
  is_negative: boolean
  reason: 'keyword_match' | 'ai_sentiment' | null
  confidence: number
  sender_id: number | null
  analyzed_at: string | null
}

interface SearchResponse {
  results: SearchResult[]
  count: number
  query: string
}

interface SearchContentProps {
  initialPhone: string
}

export function SearchContent({ initialPhone }: SearchContentProps) {
  const { handleError } = useApiError()
  const [query, setQuery] = useState("")
  const [chatId, setChatId] = useState("")
  const [negativeOnly, setNegativeOnly] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SearchResponse | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || query.trim().length < 2) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const body: Record<string, unknown> = {
        phone: initialPhone,
        query: query.trim(),
        negative_only: negativeOnly,
        limit: 100,
      }
      if (chatId.trim()) {
        const parsed = parseInt(chatId.trim(), 10)
        if (!isNaN(parsed)) body.chat_id = parsed
      }

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: res.statusText }))
        throw new ApiError(res.status, errData.detail || res.statusText)
      }

      setResults(await res.json())
    } catch (err: unknown) {
      const msg = await handleError(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Xabar qidiruvi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ilgari tahlil qilingan xabarlar orasidan qidiring
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="rounded-2xl border border-border/40 bg-card p-6 mb-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Kalit so'z kiriting..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-10"
                minLength={2}
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Chat ID (ixtiyoriy)"
                  value={chatId}
                  onChange={e => setChatId(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="negative-only"
                  checked={negativeOnly}
                  onCheckedChange={setNegativeOnly}
                />
                <Label htmlFor="negative-only" className="text-sm text-muted-foreground cursor-pointer">
                  Faqat negativ
                </Label>
              </div>

              <Button
                type="submit"
                disabled={loading || query.trim().length < 2}
                className="sm:w-auto w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Qidirish
              </Button>
            </div>
          </div>
        </form>

        {error && (
          <AlertMessage
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}

        {/* Results */}
        {results && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{results.count}</span> ta
                natija topildi — &quot;{results.query}&quot;
              </span>
            </div>

            {results.results.length === 0 ? (
              <div className="rounded-2xl border border-border/40 bg-card p-12 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  Hech narsa topilmadi. Boshqa kalit so'z kiriting yoki avval chatni tahlil qiling.
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
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                              Lug&apos;at
                            </Badge>
                          )}
                          {item.reason === 'ai_sentiment' && (
                            <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                              AI Tahlili
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Chat {item.chat_id}
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
