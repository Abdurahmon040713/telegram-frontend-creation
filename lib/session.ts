import { jwtVerify } from 'jose'

import { TOKEN_COOKIE } from '@/lib/auth-cookies'

export type SessionPayload = {
  phone: string
}

type CookieReader = {
  get: (name: string) => { value: string } | undefined
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  const jwtSecret = process.env.JWT_SECRET_KEY
  if (!jwtSecret) return null

  try {
    const secret = new TextEncoder().encode(jwtSecret)
    const { payload } = await jwtVerify(token, secret)
    const phone = payload.phone
    if (typeof phone !== 'string' || !phone) return null
    return { phone }
  } catch {
    return null
  }
}

export async function getSessionFromCookies(
  cookieStore: CookieReader
): Promise<SessionPayload | null> {
  const token = cookieStore.get(TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}
