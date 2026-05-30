import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json({ detail: 'Authentifikatsiya talab qilinadi' }, { status: 401 })
    }

    const { chatId } = await params

    const response = await fetch(
      `${BACKEND_URL}/violations/${encodeURIComponent(chatId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (response.status === 401) {
      const res = NextResponse.json(
        { detail: "Sessiyaning muddati tugagan. Qayta kirib o'ting." },
        { status: 401 }
      )
      res.cookies.delete('telegram_token')
      res.cookies.delete('telegram_phone')
      return res
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Xatolik yuz berdi' }))
      return NextResponse.json(error, { status: response.status })
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error('Violations error:', error)
    return NextResponse.json(
      { detail: "Qoidabuzarlar ro'yxatini olishda xatolik" },
      { status: 500 }
    )
  }
}
