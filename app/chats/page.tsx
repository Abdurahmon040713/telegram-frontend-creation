import { Navbar } from "@/components/navbar"
import { ChatsContent } from "@/components/features/chats/chats-content"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { Chat } from "@/lib/api"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default async function ChatsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('telegram_token')?.value
  const phone = cookieStore.get('telegram_phone')?.value

  if (!token || !phone) {
    redirect('/login')
  }

  // Server-side pre-fetch: backend POST /chats endpointi token va phone talab qiladi
  let initialChats: Chat[] = []
  try {
    const chatsResponse = await fetch(`${BACKEND_URL}/chats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
      cache: 'no-store',
    })

    if (chatsResponse.ok) {
      const data = await chatsResponse.json()
      initialChats = data.chats || []
    }
    // Server-side xatolik bo'lsa: bo'sh ro'yxat bilan davom eting,
    // foydalanuvchi "Yangilash" tugmasi orqali qayta yuklashi mumkin.
  } catch {
    // Network xatolik — client-side refresh bilan hal qilinadi
  }

  return (
    <>
      <Navbar />
      <ChatsContent initialChats={initialChats} initialPhone={phone} />
    </>
  )
}
