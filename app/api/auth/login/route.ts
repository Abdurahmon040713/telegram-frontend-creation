import { NextRequest, NextResponse } from 'next/server'

import { setPhoneCookie } from '@/lib/auth-cookies'
import { BACKEND_URL } from '@/lib/backend-url'

/**
 * POST /api/auth/login
 * Login so'rovini backend'ga yuborish va telefon raqamini cookie'ga saqlash.
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

    const normalizedPhone = phone.trim().replace(/[\s\-\(\)]/g, '')
    setPhoneCookie(response, normalizedPhone)

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { detail: 'Login jarayonida xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
