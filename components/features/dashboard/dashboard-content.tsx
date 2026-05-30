"use client"

import { useId } from "react"
import Link from "next/link"
import {
  MessageSquare, Search, BarChart3, User,
  ArrowRight, TrendingDown, Activity, Hash,
  AlertTriangle, Clock, ChevronRight,
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"
import type { StatsData } from "@/app/api/stats/route"

interface DashboardContentProps {
  phone: string
  stats: StatsData | null
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "Hozir"
  if (m < 60) return `${m} daqiqa oldin`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} soat oldin`
  return `${Math.floor(h / 24)} kun oldin`
}

function shortDate(iso: string): string {
  // "2026-05-13" → "13-may"
  try {
    const [, m, d] = iso.split("-")
    const months = ["yan","fev","mar","apr","may","iyn","iyl","avg","sen","okt","noy","dek"]
    return `${parseInt(d, 10)}-${months[parseInt(m, 10) - 1]}`
  } catch {
    return iso
  }
}

function StatCard({
  label, value, sub, accentClass,
}: { label: string; value: string | number; sub?: string; accentClass?: string }) {
  return (
    <div className={cn(
      "rounded-2xl border border-border/40 bg-card p-5 flex flex-col gap-1 border-l-4",
      accentClass ?? "border-l-border/40",
    )}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-foreground tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// Recharts custom tooltip
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/40 bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{shortDate(label ?? "")}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export function DashboardContent({ phone, stats }: DashboardContentProps) {
  const chartId = useId()
  const negativeRate = stats && stats.total_analyzed > 0
    ? ((stats.total_negative / stats.total_analyzed) * 100).toFixed(1)
    : "0.0"

  const chartData = stats?.chart_data ?? []
  const hasChart  = chartData.length >= 2

  const quickActions = [
    { title: "Chatlar",  desc: "Guruh va kanallarni ko'ring",    icon: MessageSquare, href: "/chats",   gradient: "from-sky-500 to-blue-600"     },
    { title: "Tahlil",   desc: "AI bilan negativ xabar aniqlang", icon: BarChart3,     href: "/analyze", gradient: "from-emerald-500 to-teal-600"  },
    { title: "Qidiruv",  desc: "Saqlangan xabarlarni qidiring",   icon: Search,        href: "/search",  gradient: "from-violet-500 to-purple-600" },
    { title: "Profil",   desc: "Hisob ma'lumotlari",              icon: User,          href: "/profile", gradient: "from-orange-500 to-rose-500"   },
  ]

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Xush kelibsiz!</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm mt-1">
            <Hash className="h-3.5 w-3.5" />{phone}
          </p>
        </div>

        {/* ── Stats cards ─────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Jami tahlil"      value={stats?.total_analyzed ?? 0} sub="xabar"             accentClass="border-l-sky-500"     />
          <StatCard label="Negativ xabarlar" value={stats?.total_negative ?? 0} sub="aniqlangan"        accentClass="border-l-red-500"     />
          <StatCard label="Chatlar"          value={stats?.chats_analyzed ?? 0} sub="tahlil qilingan"   accentClass="border-l-emerald-500" />
          <StatCard label="Negativ ulush"    value={`${negativeRate}%`}         sub="o'rtacha"          accentClass="border-l-violet-500"  />
        </div>

        {/* ── Trend chart ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/40 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tahlil trendi</h2>
              <p className="text-xs text-muted-foreground mt-0.5">So'nggi 14 kun</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500/70" />
                Tahlil
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/70" />
                Negativ
              </span>
            </div>
          </div>

          {hasChart ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`${chartId}-gradAnalyzed`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id={`${chartId}-gradNegative`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false} tickLine={false} allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="analyzed" name="Tahlil"
                  stroke="#0ea5e9" strokeWidth={2}
                  fill={`url(#${chartId}-gradAnalyzed)`} dot={false} activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone" dataKey="negative" name="Negativ"
                  stroke="#ef4444" strokeWidth={2}
                  fill={`url(#${chartId}-gradNegative)`} dot={false} activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center rounded-xl bg-muted/30">
              <div className="text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Grafik uchun kamida 2 kun ma&apos;lumot kerak
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Quick actions ───────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Tezkor harakatlar
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map(a => {
              const Icon = a.icon
              return (
                <Link key={a.title} href={a.href}
                  className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg">
                  <div className={cn("mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br", a.gradient)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="font-semibold text-foreground leading-tight">{a.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug">{a.desc}</p>
                  <ArrowRight className="absolute right-4 bottom-4 h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── Recent analyses ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            So&apos;nggi tahlillar
          </h2>
          {!stats || stats.recent_analyses.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
              <Activity className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                Hali tahlil qilinmagan.{" "}
                <Link href="/chats" className="text-primary hover:underline">
                  Chatlar sahifasiga o&apos;ting
                </Link>{" "}
                va birinchi tahlilni boshlang.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden divide-y divide-border/40">
              {stats.recent_analyses.map((item) => {
                const pct = item.analyzed_count > 0
                  ? Math.round((item.negative_count / item.analyzed_count) * 100) : 0
                return (
                  <div key={`${item.chat_id}-${item.completed_at}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">Chat #{item.chat_id}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{item.analyzed_count} xabar</span>
                        {item.negative_count > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-red-400">
                            <AlertTriangle className="h-3 w-3" />{item.negative_count} negativ
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {pct > 0 && (
                        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full",
                          pct > 10 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-500")}>
                          {pct}%
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />{relativeTime(item.completed_at)}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Safety note ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <TrendingDown className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Ma&apos;lumotlar xavfsiz</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Telegram sessiyasi AES-256 bilan shifrlangan. Shaxsiy ma&apos;lumotlaringiz
              hech qachon uchinchi tomonga uzatilmaydi.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
