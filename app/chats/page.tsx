import { Navbar } from "@/components/navbar"
import { ChatsContent } from "@/components/features/chats/chats-content"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function ChatsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('telegram_token')?.value

  if (!token) {
    redirect('/login')
  }

  // Server-side data fetching
  const [chatsResponse, phoneResponse] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Since data might change
    }),
    fetch('/api/auth/phone', {
      headers: {
        'Cookie': cookieStore.toString(),
      },
    })
  ])

  if (!chatsResponse.ok || !phoneResponse.ok) {
    // Handle error, perhaps redirect or show error
    redirect('/login')
  }

  const chats = await chatsResponse.json()
  const phoneData = await phoneResponse.json()
  const phone = phoneData.phone

  return (
    <>
      <Navbar />
      <ChatsContent initialChats={chats} initialPhone={phone} />
    </>
  )
}
