import { Navbar } from "@/components/navbar"
import { DashboardContent } from "@/components/features/dashboard/dashboard-content"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { serverFetch } from "@/lib/api"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('telegram_token')?.value

  if (!token) {
    redirect('/login')
  }

  // Server-side data fetching - absolute URL bilan
  try {
    const phoneData = await serverFetch<{ phone: string }>('/auth/phone', {
      method: 'GET',
    })
    const phone = phoneData.phone

    if (!phone) {
      redirect('/login')
    }

    return (
      <>
        <Navbar />
        <DashboardContent initialPhone={phone} />
      </>
    )
  } catch {
    redirect('/login')
  }
}
