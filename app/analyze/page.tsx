import { Navbar }          from "@/components/navbar"
import { AnalyzeContent }  from "@/components/features/analyze/analyze-content"
import { cookies }         from "next/headers"
import { redirect }        from "next/navigation"
import type { Chat }       from "@/lib/api"

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export default async function AnalyzePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('telegram_token')?.value
  const phone = cookieStore.get('telegram_phone')?.value

  if (!token || !phone) {
    redirect('/login')
  }

  let initialChats: Chat[] = []
  let redirectToLogin = false
  try {
    const res = await fetch(`${BACKEND_URL}/chats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })

    if (res.status === 401) {
      redirectToLogin = true
    } else if (res.ok) {
      const data = await res.json()
      initialChats = data.chats || []
    }
  } catch {
    // Network error — client-side Yangilash handles recovery
  }

  if (redirectToLogin) {
    cookieStore.delete('telegram_token')
    cookieStore.delete('telegram_phone')
    redirect('/login')
  }

  return (
    <>
      <Navbar />
      <AnalyzeContent initialChats={initialChats} initialPhone={phone} />
    </>
  )
}
