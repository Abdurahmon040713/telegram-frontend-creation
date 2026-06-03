import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/proxy-backend'
import { moderationBackendPath } from '@/lib/moderation-paths'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string; userId: string }> },
) {
  try {
    const { chatId, userId } = await params
    const body = await request.json().catch(() => ({}))
    return proxyToBackend(
      moderationBackendPath(chatId, `/mute/${userId}`),
      { method: 'POST', body: JSON.stringify(body) },
    )
  } catch (error) {
    console.error('Mute error:', error)
    return NextResponse.json(
      { detail: 'Jimlantirishda xatolik' },
      { status: 500 },
    )
  }
}
