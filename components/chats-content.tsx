"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Users, Radio, Loader2, Search, BarChart3, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertMessage } from "@/components/alert-message"
import { chatsApi, analyzeApi, tokenUtils, type Chat, type AnalyzeResponse } from "@/lib/api"
import { cn } from "@/lib/utils"

export function ChatsContent() {
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null)
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)

  useEffect(() => {
    const phone = tokenUtils.getPhone()
    if (!phone) {
      router.push("/login")
      return
    }
    fetchChats(phone)
  }, [router])

  const fetchChats = async (phone: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await chatsApi.getChats(phone)
      setChats(response.chats)
    } catch (err: any) {
      setError(err.message || "Chatlarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async (chat: Chat) => {
    const phone = tokenUtils.getPhone()
    if (!phone) return

    setAnalyzing(chat.id)
    setSelectedChat(chat)
    setError(null)

    try {
      const result = await analyzeApi.analyze({
        phone,
        chat_id: chat.id,
        limit: 50,
      })
      setAnalysisResult(result)
    } catch (err: any) {
      setError(err.message || "Tahlil qilishda xatolik")
    } finally {
      setAnalyzing(null)
    }
  }

  const filteredChats = chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const getChatIcon = (type: string) => {
    switch (type) {
      case "Group":
        return Users
      case "Channel":
        return Radio
      default:
        return MessageSquare
    }
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
          <Button
            variant="outline"
            onClick={() => {
              const phone = tokenUtils.getPhone()
              if (phone) fetchChats(phone)
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Yangilash
          </Button>
        </div>

        {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} className="mb-6" />}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Chatlarni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            {filteredChats.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Chat topilmadi</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
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
                    <Button size="sm" onClick={() => handleAnalyze(chat)} disabled={analyzing === chat.id}>
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

          <div className="lg:sticky lg:top-24 lg:self-start">
            {analysisResult && selectedChat ? (
              <div className="rounded-2xl border border-border/40 bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Tahlil natijalari: {selectedChat.title}</h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Tahlil qilindi</p>
                    <p className="text-2xl font-bold text-foreground">{analysisResult.analyzed_count}</p>
                  </div>
                  <div className="rounded-xl bg-red-500/10 p-4">
                    <p className="text-sm text-red-400">Negativ xabarlar</p>
                    <p className="text-2xl font-bold text-red-400">{analysisResult.negative_count}</p>
                  </div>
                </div>

                {analysisResult.negative_messages.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <h3 className="text-sm font-medium text-muted-foreground">Negativ xabarlar ro'yxati:</h3>
                    {analysisResult.negative_messages.map((msg) => (
                      <div key={msg.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground break-words">{msg.text}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Ishonch: {(msg.confidence * 100).toFixed(1)}%
                            </p>
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
                    <p className="text-muted-foreground">Negativ xabarlar topilmadi! 🎉</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium text-foreground">Tahlil qilish</h3>
                <p className="mt-2 text-sm text-muted-foreground">Chatni tanlang va "Tahlil" tugmasini bosing</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
