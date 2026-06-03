import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/proxy-backend'

/**
 * GET /api/chats/banned?chat_id=-100...
 * Manfiy Telegram chat_id uchun barqaror proxy (path segment muammolarini oldini oladi).
 */
export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get('chat_id')
  if (!chatId?.trim()) {
    return NextResponse.json(
      { detail: 'chat_id query parametri talab qilinadi' },
      { status: 400 },
    )
  }

  try {
    const q = encodeURIComponent(chatId.trim())
    return proxyToBackend(`/api/chats/banned?chat_id=${q}`)
  } catch (error) {
    console.error('Banned list (query) error:', error)
    return NextResponse.json(
      { detail: "Bloklanganlar ro'yxatini olishda xatolik" },
      { status: 500 },
    )
  }
}