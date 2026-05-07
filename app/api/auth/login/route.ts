import { NextRequest, NextResponse } from 'next/server'
import { setAuthToken, setPhoneNumber, getAuthToken } from '@/app/actions/auth-action'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * POST /api/auth/login
 * Login so'rovini backend'ga yuborish va tokenni cookie'ga saqlash
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { api_id, api_hash, phone } = body

    // Validation
    if (!api_id || !api_hash || !phone) {
      return NextResponse.json(
        { detail: 'api_id, api_hash va phone talab qilinadi' },
        { status: 400 }
      )
    }

    // Backend'ga so'rov yuborish
    const response = await fetch(`${BACKEND_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_id, api_hash, phone }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Xatolik yuz berdi' }))
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()

    // Telefonni cookie'ga saqlash
    await setPhoneNumber(phone)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { detail: 'Login jarayonida xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
