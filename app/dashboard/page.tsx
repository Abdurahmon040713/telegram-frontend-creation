import { Navbar } from "@/components/navbar"
import { DashboardContent } from "@/components/features/dashboard/dashboard-content"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { StatsData } from "@/app/api/stats/route"
import { BACKEND_URL }   from "@/lib/backend-url"

function maskPhone(p: string): string {
  if (p.length < 6) return "***"
  return p.slice(0, 3) + "•".repeat(Math.max(0, p.length - 6)) + p.slice(-3)
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('telegram_token')?.value
  const phone = cookieStore.get('telegram_phone')?.value

  // #region agent log
  fetch('http://127.0.0.1:7648/ingest/55b2d326-e327-4646-a7ee-400eedec4875',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'02af9a'},body:JSON.stringify({sessionId:'02af9a',location:'dashboard/page.tsx',message:'dashboard cookie check',data:{hasToken:!!token,hasPhone:!!phone},timestamp:Date.now(),hypothesisId:'C,D'})}).catch(()=>{});
  // #endregion

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
