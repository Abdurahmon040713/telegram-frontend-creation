"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, ShieldAlert, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { moderationApi, type BannedUser } from "@/lib/api"
import { normalizeBannedResponse } from "@/lib/normalize-banned-response"
import { cn } from "@/lib/utils"
import { useApiError } from "@/lib/hooks/useApiError"

interface BlacklistPanelProps {
  chatId: number
  onError?: (message: string) => void
}

function formatBannedAt(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function userDisplayName(u: BannedUser): string {
  if (u.first_name?.trim()) return u.first_name.trim()
  if (u.username) return `@${u.username}`
  return "Noma'lum"
}

export function BlacklistPanel({ chatId, onError }: BlacklistPanelProps) {
  const { handleError } = useApiError()

  const [restrictionMode, setRestrictionMode] = useState(false)
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [unbanLoading, setUnbanLoading] = useState<number | null>(null)

  const loadBanned = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await moderationApi.getBanned(chatId)
      const data = normalizeBannedResponse(raw, chatId)
      setRestrictionMode(data.restriction_mode)
      setBannedUsers(data.banned_users)
    } catch (err: unknown) {
      onError?.(await handleError(err))
    } finally {
      setLoading(false)
    }
  }, [chatId, handleError, onError])

  useEffect(() => {
    loadBanned()
  }, [loadBanned])

  const handleToggleRestriction = async (enabled: boolean) => {
    setToggleLoading(true)
    try {
      const res = await moderationApi.toggleRestriction(chatId, enabled)
      setRestrictionMode(res.restriction_mode)
    } catch (err: unknown) {
      onError?.(await handleError(err))
    } finally {
      setToggleLoading(false)
    }
  }

  const handleUnban = async (userId: number) => {
    setUnbanLoading(userId)
    try {
      await moderationApi.unban(chatId, userId)
      setBannedUsers((prev) => prev.filter((u) => u.user_id !== userId))
    } catch (err: unknown) {
      onError?.(await handleError(err))
    } finally {
      setUnbanLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Ma&apos;lumotlar yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Kirish cheklovi */}
      <section
        className={cn(
          "flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
          restrictionMode
            ? "border-amber-500/35 bg-amber-500/5"
            : "border-border/50 bg-muted/30",
        )}
      >
        <div className="flex gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
              restrictionMode
                ? "bg-amber-500/15 text-amber-600"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <Label
              htmlFor={`restriction-${chatId}`}
              className="text-sm font-semibold text-foreground"
            >
              Kirish cheklovi
            </Label>
            <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
              {restrictionMode
                ? "Yoqilgan: qora ro'yxatdagilar ushbu guruhga qayta qo'shila olmaydi."
                : "O'chirilgan: qora ro'yxat faqat yozuv sifatida saqlanadi, qayta kirish cheklanmaydi."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:shrink-0">
          <span className="text-xs text-muted-foreground">
            {restrictionMode ? "Yoniq" : "O'chiq"}
          </span>
          <Switch
            id={`restriction-${chatId}`}
            checked={restrictionMode}
            disabled={toggleLoading}
            onCheckedChange={handleToggleRestriction}
          />
        </div>
      </section>

      {/* Jadval */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Bloklangan foydalanuvchilar
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {bannedUsers.length} ta
          </span>
        </div>

        {bannedUsers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
            <UserX className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Hozircha bloklangan foydalanuvchi yo&apos;q
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Ism</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Bloklangan sana</TableHead>
                  <TableHead className="text-right w-[140px]">Amal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bannedUsers.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">
                      {userDisplayName(u)}
                      {u.username && u.first_name && (
                        <span className="block text-xs text-muted-foreground font-normal">
                          @{u.username}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {u.user_id}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatBannedAt(u.banned_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                        disabled={unbanLoading === u.user_id}
                        onClick={() => handleUnban(u.user_id)}
                      >
                        {unbanLoading === u.user_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Blokdan ochish"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}