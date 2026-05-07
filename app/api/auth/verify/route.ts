import { NextRequest, NextResponse } from 'next/server'
import { setAuthToken } from '@/app/actions/auth-action'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * POST /api/auth/verify
 * Telefon kodi orqali verify qilish va tokenni cookie'ga saqlash
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code, phone_code_hash, api_id, api_hash } = body

    // Validation
    if (!phone || !code || !phone_code_hash || !api_id || !api_hash) {
      return NextResponse.json(
        { detail: 'Barcha maydonlar talab qilinadi' },
        { status: 400 }
      )
    }

    // Backend'ga verify so'rovini yuborish
    const response = await fetch(`${BACKEND_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        code,
        phone_code_hash,
        api_id,
        api_hash,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Xatolik yuz berdi' }))
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()

    // Agar javobda token bo'lsa, saqlash
    if (data.token || data.access_token) {
      const token = data.token || data.access_token
      await setAuthToken(token)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { detail: 'Verify jarayonida xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
