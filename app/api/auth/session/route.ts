import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSessionFromCookies } from '@/lib/session'

/**
 * GET /api/auth/session
 * Cookie'dagi JWT ni tekshiradi.
 */
export async function GET() {
  const cookieStore = await cookies()
  const session = await getSessionFromCookies(cookieStore)

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    phone: session.phone,
  })
}
