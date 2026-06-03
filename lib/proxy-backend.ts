import { NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'
import { BACKEND_URL } from '@/lib/backend-url'

export { BACKEND_URL }

export async function proxyToBackend(
  path: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  const token = await getAuthToken()
  if (!token) {
    return NextResponse.json(
      { detail: 'Authentifikatsiya talab qilinadi' },
      { status: 401 },
    )
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })

  if (response.status === 401) {
    const res = NextResponse.json(
      { detail: "Sessiyaning muddati tugagan. Qayta kirib o'ting." },
      { status: 401 },
    )
    res.cookies.delete('telegram_token')
    res.cookies.delete('telegram_phone')
    return res
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Xatolik yuz berdi' }))
    return NextResponse.json(error, { status: response.status })
  }

  return NextResponse.json(await response.json())
}