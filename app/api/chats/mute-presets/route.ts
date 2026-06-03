import { NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/proxy-backend'

export async function GET() {
  try {
    return proxyToBackend('/api/chats/mute-presets', { method: 'GET' })
  } catch (error) {
    console.error('Mute presets error:', error)
    return NextResponse.json(
      { detail: 'Jimlantirish variantlarini olishda xatolik' },
      { status: 500 },
    )
  }
}
