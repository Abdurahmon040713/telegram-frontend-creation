"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Eye, EyeOff, Loader2, MessageSquare, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertMessage } from "@/components/alert-message"
import { authApi, ApiError } from "@/lib/api"

type Step = "credentials" | "verification" | "twofa"

const STEP_LABELS: Record<Step, string> = {
  credentials:  "Hisob ma'lumotlari",
  verification: "Tasdiqlash kodi",
  twofa:        "Ikki bosqichli parol",
}

const STEPS: Step[] = ["credentials", "verification", "twofa"]

export function LoginForm() {
  const [step, setStep]           = useState<Step>("credentials")
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)

  const [apiId, setApiId]         = useState("")
  const [apiHash, setApiHash]     = useState("")
  const [phone, setPhone]         = useState("")
  const [draftCode, setDraftCode] = useState("")
  const [twoFaPass, setTwoFaPass] = useState("")
  const [phoneCodeHash, setPhoneCodeHash] = useState("")
  const [showApiHash, setShowApiHash]     = useState(false)
  const [showTwoFaPass, setShowTwoFaPass] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      if (String((e.reason as Error)?.message ?? e.reason).includes('A listener indicated'))
        e.preventDefault()
    }
    window.addEventListener('unhandledrejection', handler)
    return () => {
      window.removeEventListener('unhandledrejection', handler)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Step 1: send SMS code ─────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError(null); setSuccess(null)
    try {
      const res = await authApi.login({
        api_id: parseInt(apiId, 10), api_hash: apiHash, phone,
      })
      if (res?.status === "waiting_for_code") {
        setPhoneCodeHash(res.phone_code_hash || "")
        setStep("verification")
        setSuccess("Tasdiqlash kodi yuborildi!")
      } else if (res?.status === "authorized") {
        window.location.href = '/dashboard'
      } else {
        throw new Error(`Noto'g'ri javob: ${res?.status}`)
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : (err as Error)?.message ?? "Login xatoligi")
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify SMS code ───────────────────────────────────────────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: draftCode.trim(),
          phone_code_hash: phoneCodeHash,
          api_id: parseInt(apiId, 10),
          api_hash: apiHash,
        }),
      })
      const data = await res.json()

      if (data.status === "2fa_required") {
        setStep("twofa")
        setSuccess("Ikki bosqichli himoya parolini kiriting")
      } else if (data.status === "success") {
        setSuccess("Muvaffaqiyatli kirildi!")
        window.location.href = '/dashboard'
      } else if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`)
      } else {
        throw new Error(`Noto'g'ri javob: ${data.status}`)
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : (err as Error)?.message ?? "Tasdiqlash xatoligi")
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: 2FA cloud password ────────────────────────────────────────────
  const handleTwoFA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password: twoFaPass }),
      })
      const data = await res.json()

      if (data.status === "success") {
        setSuccess("Muvaffaqiyatli kirildi!")
        window.location.href = '/dashboard'
      } else if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`)
      } else {
        throw new Error(`Noto'g'ri javob: ${data.status}`)
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : (err as Error)?.message ?? "2FA xatoligi")
    } finally {
      setLoading(false)
    }
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">

        {/* ── Brand ─────────────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <MessageSquare className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tizimga kirish</h1>
          <p className="mt-1 text-sm text-muted-foreground">{STEP_LABELS[step]}</p>
        </div>

        {/* ── Step bar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= stepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-xl">
          {error   && <AlertMessage type="error"   message={error}   onClose={() => setError(null)}   className="mb-4" />}
          {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} className="mb-4" />}

          {/* ── Credentials ───────────────────────────────────────────────── */}
          {step === "credentials" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api_id">API ID</Label>
                <Input id="api_id" type="number" placeholder="123456"
                  value={apiId} onChange={e => setApiId(e.target.value)}
                  required className="bg-background" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_hash">API Hash</Label>
                <div className="relative">
                  <Input id="api_hash" type={showApiHash ? "text" : "password"}
                    placeholder="a1b2c3d4…" value={apiHash}
                    onChange={e => setApiHash(e.target.value)}
                    required className="bg-background pr-10" />
                  <button type="button"
                    onClick={() => setShowApiHash(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showApiHash ? "Yashirish" : "Ko'rsatish"}>
                    {showApiHash ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon raqam</Label>
                <Input id="phone" type="tel" placeholder="+998901234567"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  required className="bg-background" />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Yuborilmoqda…</> : "Davom etish"}
              </Button>
            </form>
          )}

          {/* ── SMS verification ──────────────────────────────────────────── */}
          {step === "verification" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Tasdiqlash kodi</Label>
                <Input id="code" type="text" inputMode="numeric" placeholder="12345"
                  value={draftCode}
                  onChange={e => setDraftCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required autoFocus
                  className="bg-background text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6} />
                <p className="text-xs text-muted-foreground text-center">
                  Telegram ilovasiga yuborilgan 5–6 xonali kodni kiriting
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading || draftCode.length < 5}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Tekshirilmoqda…</> : "Tasdiqlash"}
              </Button>
              <Button type="button" variant="ghost" className="w-full"
                onClick={() => { setStep("credentials"); setError(null); setDraftCode("") }}>
                Orqaga
              </Button>
            </form>
          )}

          {/* ── 2FA cloud password ────────────────────────────────────────── */}
          {step === "twofa" && (
            <form onSubmit={handleTwoFA} className="space-y-4">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2 mb-2">
                <Lock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-600 leading-relaxed">
                  Bu hisob ikki bosqichli himoya bilan himoyalangan.
                  Telegram Cloud parolini kiriting.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twofa_pass">Bulut paroli</Label>
                <div className="relative">
                  <Input id="twofa_pass"
                    type={showTwoFaPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={twoFaPass} onChange={e => setTwoFaPass(e.target.value)}
                    required autoFocus className="bg-background pr-10" />
                  <button type="button"
                    onClick={() => setShowTwoFaPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showTwoFaPass ? "Yashirish" : "Ko'rsatish"}>
                    {showTwoFaPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || twoFaPass.length < 1}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Tekshirilmoqda…</> : "Kirish"}
              </Button>
              <Button type="button" variant="ghost" className="w-full"
                onClick={() => { setStep("credentials"); setError(null); setTwoFaPass("") }}>
                Boshidan boshlash
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            API ID va Hash olish uchun{" "}
            <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline">
              my.telegram.org
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
