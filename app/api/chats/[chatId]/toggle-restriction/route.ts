import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/proxy-backend'
import { moderationBackendPath } from '@/lib/moderation-paths'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params
    const body = await request.json()
    return proxyToBackend(
      moderationBackendPath(chatId, '/toggle-restriction'),
      { method: 'POST', body: JSON.stringify(body) },
    )
  } catch (error) {
    console.error('Toggle restriction error:', error)
    return NextResponse.json(
      { detail: 'Cheklov rejimini yangilashda xatolik' },
      { status: 500 },
    )
  }
}