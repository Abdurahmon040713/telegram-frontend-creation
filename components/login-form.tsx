"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertMessage } from "@/components/alert-message"
import { authApi, tokenUtils } from "@/lib/api"

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<"credentials" | "verification">("credentials")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [apiId, setApiId] = useState("")
  const [apiHash, setApiHash] = useState("")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [phoneCodeHash, setPhoneCodeHash] = useState("")
  const [showApiHash, setShowApiHash] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await authApi.login({
        api_id: Number.parseInt(apiId),
        api_hash: apiHash,
        phone: phone,
      })

      if (response.status === "waiting_for_code") {
        setPhoneCodeHash(response.phone_code_hash || "")
        setStep("verification")
        setSuccess("Tasdiqlash kodi yuborildi!")
      } else if (response.status === "authorized") {
        tokenUtils.setPhone(phone)
        localStorage.setItem("telegram_api_id", apiId)
        localStorage.setItem("telegram_api_hash", apiHash)
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Login xatoligi")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await authApi.verify({
        phone: phone,
        code: code,
        phone_code_hash: phoneCodeHash,
        api_id: Number.parseInt(apiId),
        api_hash: apiHash,
      })

      if (response.status === "success") {
        tokenUtils.setPhone(phone)
        localStorage.setItem("telegram_api_id", apiId)
        localStorage.setItem("telegram_api_hash", apiHash)
        setSuccess("Muvaffaqiyatli kirildi!")
        setTimeout(() => router.push("/dashboard"), 1000)
      }
    } catch (err: any) {
      setError(err.message || "Tasdiqlash xatoligi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <MessageSquare className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tizimga kirish</h1>
          <p className="mt-2 text-sm text-muted-foreground">Telegram hisobingiz orqali kiring</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-xl">
          {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          {success && <AlertMessage type="success" message={success} className="mb-4" />}

          {step === "credentials" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api_id">API ID</Label>
                <Input
                  id="api_id"
                  type="number"
                  placeholder="123456"
                  value={apiId}
                  onChange={(e) => setApiId(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_hash">API Hash</Label>
                <div className="relative">
                  <Input
                    id="api_hash"
                    type={showApiHash ? "text" : "password"}
                    placeholder="a1b2c3d4e5f6..."
                    value={apiHash}
                    onChange={(e) => setApiHash(e.target.value)}
                    required
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiHash(!showApiHash)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiHash ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon raqam</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+998901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Yuborilmoqda...
                  </>
                ) : (
                  "Kirish"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Tasdiqlash kodi</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="12345"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="bg-background text-center text-2xl tracking-widest"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Telegram ilovasiga yuborilgan kodni kiriting
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Tekshirilmoqda...
                  </>
                ) : (
                  "Tasdiqlash"
                )}
              </Button>

              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("credentials")}>
                Orqaga qaytish
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            API ID va Hash olish uchun{" "}
            <a
              href="https://my.telegram.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              my.telegram.org
            </a>{" "}
            saytiga tashrif buyuring
          </p>
        </div>
      </div>
    </div>
  )
}
