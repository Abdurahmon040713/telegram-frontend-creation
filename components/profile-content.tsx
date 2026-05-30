"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  User, Phone, LogOut, Shield, Clock,
  BarChart3, MessageSquare, Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ProfileContentProps {
  phone: string
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return "***"
  return phone.slice(0, 3) + "•".repeat(Math.max(0, phone.length - 6)) + phone.slice(-3)
}

export function ProfileContent({ phone }: ProfileContentProps) {
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
  }, [router])

  const quickLinks = [
    { href: "/chats",   icon: MessageSquare, label: "Chatlar",  desc: "Barcha chatlarni ko'ring" },
    { href: "/analyze", icon: BarChart3,     label: "Tahlil",   desc: "Yangi tahlil boshlang"    },
    { href: "/search",  icon: Search,        label: "Qidiruv",  desc: "Saqlangan xabarlar"       },
  ]

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── Avatar + identity ───────────────────────────────────────── */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 ring-4 ring-primary/20">
            <User className="h-12 w-12 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Profil</h1>
          <p className="mt-1 text-sm text-muted-foreground">{maskPhone(phone)}</p>
        </div>

        {/* ── Account details ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <h2 className="text-sm font-semibold text-foreground">Hisob ma&apos;lumotlari</h2>
          </div>
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Phone className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telefon raqam</p>
              <p className="font-mono font-medium text-foreground">{phone}</p>
            </div>
          </div>
        </div>

        {/* ── Quick links ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <h2 className="text-sm font-semibold text-foreground">Tezkor harakatlar</h2>
          </div>
          <div className="divide-y divide-border/40">
            {quickLinks.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── Session info ────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/40 bg-card p-5 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Shield className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Sessiya faol</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                AES-256 bilan shifrlangan. Xavfsizlik kafolatlangan.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-5 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
              <Clock className="h-4 w-4 text-sky-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Token muddati</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                24 soatdan so&apos;ng avtomatik yangilanadi.
              </p>
            </div>
          </div>
        </div>

        {/* ── Logout ──────────────────────────────────────────────────── */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Tizimdan chiqish
        </Button>

      </div>
    </div>
  )
}
