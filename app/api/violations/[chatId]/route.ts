import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/proxy-backend'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params
    return proxyToBackend(`/violations/${encodeURIComponent(chatId)}`)
  } catch (error) {
    console.error('Violations error:', error)
    return NextResponse.json(
      { detail: "Qoidabuzarlar ro'yxatini olishda xatolik" },
      { status: 500 },
    )
  }
}