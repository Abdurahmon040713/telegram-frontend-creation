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
      moderationBackendPath(chatId, `/reset-warns/${userId}`),
      { method: 'POST', body: JSON.stringify({}) },
    )
  } catch (error) {
    console.error('Reset warns error:', error)
    return NextResponse.json(
      { detail: "Ogohlantirishlarni tiklashda xatolik" },
      { status: 500 },
    )
  }
}