import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // Cookie'dan tokenni o'qish
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json(
        { detail: 'Authentifikatsiya talab qilinadi' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { phone } = body

    // Backend'ga token bilan so'rov yuborish
    const response = await fetch(`${BACKEND_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ TOKEN QUSHILDI
      },
      body: JSON.stringify({ phone }),
    })

    if (response.status === 401) {
      // Token muddati tugangan - logout qilish
      const { clearAuthCookies } = await import('@/app/actions/auth-action')
      await clearAuthCookies()
      return NextResponse.json(
        { detail: 'Sessiyaning muddati tugagan. Qayta kirib o\'ting.' },
        { status: 401 }
      )
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Xatolik yuz berdi' }))
      return NextResponse.json(error, { status: response.status })
    }

    return response.json()
  } catch (error) {
    console.error('Chats error:', error)
    return NextResponse.json(
      { detail: 'Chatlarni yuklashda xatolik yuz berdi' },
      { status: 500 }
    )
  }
}