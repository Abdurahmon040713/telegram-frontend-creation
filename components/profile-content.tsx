"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User, Phone, Key, Hash, LogOut, Shield, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { tokenUtils } from "@/lib/api"

export function ProfileContent() {
  const router = useRouter()
  const [userData, setUserData] = useState<{
    phone: string | null
    apiId: string | null
    apiHash: string | null
  }>({
    phone: null,
    apiId: null,
    apiHash: null,
  })

  useEffect(() => {
    const phone = tokenUtils.getPhone()
    if (!phone) {
      router.push("/login")
      return
    }

    setUserData({
      phone,
      apiId: localStorage.getItem("telegram_api_id"),
      apiHash: localStorage.getItem("telegram_api_hash"),
    })
  }, [router])

  const handleLogout = () => {
    tokenUtils.removeToken()
    tokenUtils.removePhone()
    localStorage.removeItem("telegram_api_id")
    localStorage.removeItem("telegram_api_hash")
    router.push("/login")
  }

  const maskString = (str: string | null, showFirst = 4) => {
    if (!str) return "***"
    if (str.length <= showFirst) return str
    return str.slice(0, showFirst) + "•".repeat(Math.min(str.length - showFirst, 10))
  }

  const profileItems = [
    { icon: Phone, label: "Telefon raqam", value: userData.phone || "Noma'lum" },
    { icon: Key, label: "API ID", value: userData.apiId || "Noma'lum" },
    { icon: Hash, label: "API Hash", value: maskString(userData.apiHash, 8) },
  ]

  if (!userData.phone) return null

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
            <User className="h-12 w-12 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Profil</h1>
          <p className="mt-1 text-muted-foreground">{userData.phone}</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="p-6 border-b border-border/40">
            <h2 className="text-lg font-semibold text-foreground">Hisob ma'lumotlari</h2>
          </div>
          <div className="divide-y divide-border/40">
            {profileItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="font-medium text-foreground truncate">{item.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border/40 bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Shield className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Sessiya faol</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sizning Telegram sessiyangiz hozirda faol. Barcha xabarlaringiz va chatlaringizga kirish imkoniyati
                mavjud.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border/40 bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
              <Clock className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Sessiya haqida</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sessiya ma'lumotlari brauzeringizda saqlanadi. Agar boshqa qurilmada foydalanmoqchi bo'lsangiz, qayta
                login qilishingiz kerak.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Tizimdan chiqish
          </Button>
        </div>
      </div>
    </div>
  )
}
