import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/proxy-backend'
import { moderationBannedBackendPath } from '@/lib/moderation-paths'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params
    return proxyToBackend(moderationBannedBackendPath(chatId))
  } catch (error) {
    console.error('Banned list error:', error)
    return NextResponse.json(
      { detail: "Bloklanganlar ro'yxatini olishda xatolik" },
      { status: 500 },
    )
  }
}