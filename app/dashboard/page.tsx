import { Navbar } from "@/components/navbar"
import { DashboardContent } from "@/components/features/dashboard/dashboard-content"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { StatsData } from "@/app/api/stats/route"

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

function maskPhone(p: string): string {
  if (p.length < 6) return "***"
  return p.slice(0, 3) + "•".repeat(Math.max(0, p.length - 6)) + p.slice(-3)
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('telegram_token')?.value
  const phone = cookieStore.get('telegram_phone')?.value

  if (!token || !phone) {
    redirect('/login')
  }

  let stats: StatsData | null = null
  let redirectToLogin = false
  try {
    const res = await fetch(`${BACKEND_URL}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })

    if (res.status === 401) {
      redirectToLogin = true
    } else if (res.ok) {
      stats = await res.json()
    }
  } catch {
    // Stats unavailable — dashboard renders with zeros gracefully
  }

  if (redirectToLogin) {
    cookieStore.delete('telegram_token')
    cookieStore.delete('telegram_phone')
    redirect('/login')
  }

  return (
    <>
      <Navbar />
      <DashboardContent phone={maskPhone(phone)} stats={stats} />
    </>
  )
}
