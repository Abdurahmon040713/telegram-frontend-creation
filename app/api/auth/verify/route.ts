import { appendFileSync } from 'fs'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

import {
  getCookieSecure,
  normalizePhoneCookie,
  setPhoneCookie,
  setTokenCookie,
} from '@/lib/auth-cookies'
import { BACKEND_URL } from '@/lib/backend-url'

/**
 * POST /api/auth/verify
 * Telefon kodi orqali verify qilish va tokenni cookie'ga saqlash.
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
      setTokenCookie(response, token)
      setPhoneCookie(response, normalizePhoneCookie(phone))
    }

    // #region agent log
    try {
      appendFileSync(
        join(process.cwd(), '..', 'debug-02af9a.log'),
        JSON.stringify({
          sessionId: '02af9a',
          runId: 'post-fix',
          location: 'verify/route.ts',
          message: 'cookie set on verify',
          data: {
            hasToken: !!token,
            cookieSecure: getCookieSecure(),
            jwtSecretSet: !!process.env.JWT_SECRET_KEY,
            cookieNames: ['telegram_token', 'telegram_phone'],
          },
          timestamp: Date.now(),
          hypothesisId: 'A,C',
        }) + '\n',
      )
    } catch { /* ignore */ }
    fetch('http://127.0.0.1:7648/ingest/55b2d326-e327-4646-a7ee-400eedec4875',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'02af9a'},body:JSON.stringify({sessionId:'02af9a',runId:'post-fix',location:'verify/route.ts',message:'cookie set on verify',data:{hasToken:!!token,cookieSecure:getCookieSecure(),jwtSecretSet:!!process.env.JWT_SECRET_KEY},timestamp:Date.now(),hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion

    return response
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { detail: 'Verify jarayonida xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
