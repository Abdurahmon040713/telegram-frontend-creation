import { NextRequest, NextResponse } from 'next/server'

import { BACKEND_URL } from '@/lib/backend-url'

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 kun

/**
 * POST /api/auth/login
 * Login so'rovini backend'ga yuborish va telefon raqamini cookie'ga saqlash.
 *
 * MUHIM: cookies() Server Action'i Route Handler'dan chaqirilganda
 * Set-Cookie header NextResponse'ga qo'shilmaydi. Shuning uchun
 * cookie to'g'ridan-to'g'ri NextResponse.cookies.set() orqali o'rnatiladi.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { api_id, api_hash, phone } = body

    if (!api_id || !api_hash || !phone) {
      return NextResponse.json(
        { detail: 'api_id, api_hash va phone talab qilinadi' },
        { status: 400 }
      )
    }

    const backendResponse = await fetch(`${BACKEND_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_id, api_hash, phone }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!backendResponse.ok) {
      const error = await backendResponse.json().catch(() => ({ detail: 'Xatolik yuz berdi' }))
      return NextResponse.json(error, { status: backendResponse.status })
    }

    const data = await backendResponse.json()
    const response = NextResponse.json(data)

    // Strip spaces/dashes so Zod regex in /api/analyze always passes
    const normalizedPhone = phone.trim().replace(/[\s\-\(\)]/g, '')

    // httpOnly: phone is read server-side via getPhoneNumber() server action only.
    response.cookies.set('telegram_phone', normalizedPhone, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { detail: 'Login jarayonida xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
