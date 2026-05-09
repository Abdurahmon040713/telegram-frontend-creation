"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertMessage } from "@/components/alert-message"
import { authApi } from "@/lib/api"
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
  const [draftCode, setDraftCode] = useState("")
  const [phoneCodeHash, setPhoneCodeHash] = useState("")
  const [showApiHash, setShowApiHash] = useState(false)
  const codeInputDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason?.message ?? String(reason)
      if (typeof message === 'string' && message.includes('A listener indicated')) {
        event.preventDefault()
        console.warn('Suppressed extension unhandled rejection:', message)
      }
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      if (codeInputDebounce.current) {
        clearTimeout(codeInputDebounce.current)
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return // Prevent multiple submissions
    
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log('Login boshlanmoqda...', { api_id: apiId, phone })
      
      const response = await authApi.login({
        api_id: Number.parseInt(apiId),
        api_hash: apiHash,
        phone: phone,
      })

      console.log('Login javob:', response)

      if (response?.status === "waiting_for_code") {
        setPhoneCodeHash(response.phone_code_hash || "")
        setStep("verification")
        setSuccess("Tasdiqlash kodi yuborildi!")
      } else if (response?.status === "authorized") {
        setSuccess("Muvaffaqiyatli kirildi!")
        router.refresh()
        setTimeout(() => router.push("/dashboard"), 500)
      } else {
        throw new Error(`Noto'g'ri javob: ${response?.status}`)
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Login xatoligi yuz berdi"
      console.error('Login xatoligi:', errorMessage, err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return // Prevent multiple submissions
    
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log('Verification boshlanmoqda...', { phone, code: code.length + ' raqam' })
      
      const verifyCode = draftCode.trim()
      setCode(verifyCode)
      const response = await authApi.verify({
        phone: phone,
        code: verifyCode,
        phone_code_hash: phoneCodeHash,
        api_id: Number.parseInt(apiId),
        api_hash: apiHash,
      })

      console.log('Verification javob:', response)

      if (response?.status === "success") {
        // Token server-side action (verify/route.ts → setAuthToken) orqali
        // httpOnly cookie'ga allaqachon saqlangan — bu yerda qayta saqlash shart emas.
        setSuccess("Muvaffaqiyatli kirildi!")
        
        // Cookielar yangilanganiga ishonch hosil qilish uchun router.refresh() ishlatamiz
        router.refresh()
        
        // Keyin dashboard'ga o'tish
        setTimeout(() => router.push("/dashboard"), 500)
      } else {
        throw new Error(`Noto'g'ri javob: ${response?.status}`)
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Tasdiqlash xatoligi yuz berdi"
      console.error('Verification xatoligi:', errorMessage, err)
      setError(errorMessage)
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
                  value={draftCode}
                  onChange={(e) => {
                    const value = e.target.value
                    setDraftCode(value)
                    if (codeInputDebounce.current) {
                      clearTimeout(codeInputDebounce.current)
                    }
                    codeInputDebounce.current = window.setTimeout(() => {
                      setCode(value)
                      codeInputDebounce.current = null
                    }, 300)
                  }}
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
