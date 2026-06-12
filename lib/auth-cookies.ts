import type { NextResponse } from 'next/server'

export const TOKEN_COOKIE = 'telegram_token'
export const PHONE_COOKIE = 'telegram_phone'

export const TOKEN_MAX_AGE = 24 * 60 * 60 // 24 soat — JWT muddat bilan mos
export const PHONE_MAX_AGE = 7 * 24 * 60 * 60 // 7 kun

/** HttpOnly cookie Secure flag — HTTP localhost Docker uchun false bo'lishi kerak. */
export function getCookieSecure(): boolean {
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase()
  if (override === 'true') return true
  if (override === 'false') return false

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return appUrl.startsWith('https://')
}

function baseCookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    secure: getCookieSecure(),
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

export function setTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(TOKEN_COOKIE, token, baseCookieOptions(TOKEN_MAX_AGE))
}

export function setPhoneCookie(response: NextResponse, phone: string): void {
  response.cookies.set(PHONE_COOKIE, phone, baseCookieOptions(PHONE_MAX_AGE))
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete({ name: TOKEN_COOKIE, path: '/' })
  response.cookies.delete({ name: PHONE_COOKIE, path: '/' })
}

/** Telefon raqamini login/verify uchun normalizatsiya qilish */
export function normalizePhoneCookie(phone: string): string {
  return phone.trim().replace(/[\s\-\(\)]/g, '')
}
