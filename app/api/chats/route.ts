import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { detail: 'phone maydoni talab qilinadi' },
        { status: 400 }
      )
    }

    const backendResponse = await fetch(`${BACKEND_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ phone }),
    })

    if (backendResponse.status === 401) {
      // Token yoki sessiya muddati tugagan — cookie'larni tozalash
      const response = NextResponse.json(
        { detail: "Sessiyaning muddati tugagan. Qayta kirib o'ting." },
        { status: 401 }
      )
      response.cookies.delete('telegram_token')
      response.cookies.delete('telegram_phone')
      return response
    }

    if (!backendResponse.ok) {
      const error = await backendResponse.json().catch(() => ({ detail: 'Xatolik yuz berdi' }))
      return NextResponse.json(error, { status: backendResponse.status })
    }

    return NextResponse.json(await backendResponse.json())
  } catch (error) {
    console.error('Chats error:', error)
    return NextResponse.json(
      { detail: 'Chatlarni yuklashda xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
