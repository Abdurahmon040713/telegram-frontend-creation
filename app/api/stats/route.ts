import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'

import { BACKEND_URL } from '@/lib/backend-url'

export interface ChartPoint {
  date: string
  analyzed: number
  negative: number
}

export interface StatsData {
  total_analyzed: number
  total_negative: number
  chats_analyzed: number
  recent_analyses: {
    chat_id: number
    analyzed_count: number
    negative_count: number
    fetch_limit: number
    completed_at: string | null
  }[]
  chart_data: ChartPoint[]
}

export async function GET(_request: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json({ detail: 'Authentifikatsiya talab qilinadi' }, { status: 401 })
    }

    const response = await fetch(`${BACKEND_URL}/stats`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })

    if (response.status === 401) {
      const res = NextResponse.json(
        { detail: "Sessiyaning muddati tugagan." },
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
    console.error('Stats error:', error)
    return NextResponse.json({ detail: 'Statistika olishda xatolik' }, { status: 500 })
  }
}
