import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/proxy-backend'
import { moderationBackendPath } from '@/lib/moderation-paths'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string; userId: string }> },
) {
  try {
    const { chatId, userId } = await params
    return proxyToBackend(
      moderationBackendPath(chatId, `/unban/${userId}`),
      { method: 'POST', body: JSON.stringify({}) },
    )
  } catch (error) {
    console.error('Unban error:', error)
    return NextResponse.json(
      { detail: 'Blokdan chiqarishda xatolik' },
      { status: 500 },
    )
  }
}