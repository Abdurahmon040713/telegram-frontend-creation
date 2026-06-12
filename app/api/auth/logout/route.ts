import { NextResponse } from 'next/server'

import { clearAuthCookies } from '@/lib/auth-cookies'

/**
 * POST /api/auth/logout
 * Auth cookie'larni o'chirish.
 */
export async function POST() {
  try {
    const response = NextResponse.json(
      { status: 'success', message: 'Logout muvaffaqiyatli bajarildi' }
    )

    clearAuthCookies(response)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { detail: 'Logout jarayonida xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
