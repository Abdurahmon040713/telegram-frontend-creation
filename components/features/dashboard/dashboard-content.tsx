"use client"

import { useState } from "react"
import Link from "next/link"
import { MessageSquare, Users, BarChart3, ArrowRight, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardContentProps {
  initialPhone: string
}

export function DashboardContent({ initialPhone }: DashboardContentProps) {
  const [phone] = useState<string>(initialPhone) // Phone is fixed from server

  const features = [
    {
      title: "Chatlarni ko'rish",
      description: "Barcha guruh va kanallarni boshqaring",
      icon: MessageSquare,
      href: "/chats",
      color: "from-sky-500 to-blue-600",
    },
    {
      title: "Xabarlarni tahlil qilish",
      description: "AI yordamida negativ xabarlarni aniqlang",
      icon: BarChart3,
      href: "/chats",
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: "Profil",
      description: "Hisob sozlamalarini boshqaring",
      icon: Users,
      href: "/profile",
      color: "from-violet-500 to-purple-600",
    },
  ]

  const stats = [
    { label: "Faol sessiya", value: phone ? "1" : "0" },
    { label: "Tahlil qilingan", value: "0" },
    { label: "Negativ xabarlar", value: "0" },
  ]

  if (!phone) return null

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Xush kelibsiz! 👋</h1>
          <p className="mt-2 text-muted-foreground">Telegram xabarlarini tahlil qilish tizimi</p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/40 bg-card p-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg"
              >
                <div
                  className={cn(
                    "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br",
                    feature.color,
                  )}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                <ArrowRight className="absolute bottom-6 right-6 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            )
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-border/40 bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Xavfsizlik haqida</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sizning ma'lumotlaringiz xavfsiz. Telegram sessiyasi faqat sizning qurilmangizda saqlanadi va biz hech
                qanday shaxsiy ma'lumotlaringizni saqlamaymiz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
