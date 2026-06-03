import { NextRequest, NextResponse } from 'next/server'

import { BACKEND_URL } from '@/lib/backend-url'

const COOKIE_MAX_AGE = 24 * 60 * 60 // 24 soat — JWT muddat bilan mos

/**
 * POST /api/auth/verify
 * Telefon kodi orqali verify qilish va tokenni cookie'ga saqlash.
 *
 * MUHIM: cookies() Server Action'i Route Handler'dan chaqirilganda
 * Set-Cookie header NextResponse'ga qo'shilmaydi. Shuning uchun
 * token to'g'ridan-to'g'ri NextResponse.cookies.set() orqali o'rnatiladi.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code, phone_code_hash, api_id, api_hash } = body

    if (!phone || !code || !phone_code_hash || !api_id || !api_hash) {
      return NextResponse.json(
        { detail: 'Barcha maydonlar talab qilinadi' },
        { status: 400 }
      )
    }

    const backendResponse = await fetch(`${BACKEND_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, phone_code_hash, api_id, api_hash }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!backendResponse.ok) {
      const error = await backendResponse.json().catch(() => ({ detail: 'Xatolik yuz berdi' }))
      return NextResponse.json(error, { status: backendResponse.status })
    }

    const data = await backendResponse.json()
    const token = data.token || data.access_token

    const response = NextResponse.json(data)

    if (token) {
      // NextResponse.cookies.set() — Set-Cookie header to'g'ridan-to'g'ri response'ga yoziladi
      response.cookies.set('telegram_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { detail: 'Verify jarayonida xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
