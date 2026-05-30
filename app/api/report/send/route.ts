import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json(
        { detail: 'Authentifikatsiya talab qilinadi' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Report sending can take longer than a regular search — allow 30 s.
    const response = await fetch(`${BACKEND_URL}/report/send`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })

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
    console.error('Report send error:', error)
    return NextResponse.json(
      { detail: 'Hisobot yuborishda xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
