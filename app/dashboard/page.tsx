import { Navbar } from "@/components/navbar"
import { DashboardContent } from "@/components/features/dashboard/dashboard-content"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { StatsData } from "@/app/api/stats/route"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('telegram_token')?.value
  const phone = cookieStore.get('telegram_phone')?.value

  if (!token || !phone) {
    redirect('/login')
  }

  let stats: StatsData | null = null
  try {
    const res = await fetch(`${BACKEND_URL}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.ok) {
      stats = await res.json()
    }
  } catch {
    // Stats unavailable — dashboard renders with zeros gracefully
  }

  return (
    <>
      <Navbar />
      <DashboardContent phone={phone} stats={stats} />
    </>
  )
}
