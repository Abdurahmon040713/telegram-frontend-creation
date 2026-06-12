'use server'

import { cookies } from 'next/headers'

import {
  getCookieSecure,
  PHONE_COOKIE,
  PHONE_MAX_AGE,
  TOKEN_COOKIE,
  TOKEN_MAX_AGE,
} from '@/lib/auth-cookies'
import { getSessionFromCookies } from '@/lib/session'

/**
 * Tokenni HttpOnly cookie'ga yozish
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: getCookieSecure(),
      sameSite: 'lax',
      maxAge: TOKEN_MAX_AGE,
      path: '/',
    })
  } catch (error) {
    console.error('Failed to set auth token:', error)
    throw new Error('Failed to set authentication token')
  }
}

/**
 * Tokenni cookie'dan o'qish (server-side faqat)
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(TOKEN_COOKIE)?.value
    return token || null
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return null
  }
}

/**
 * Telefonni cookie'ga yozish
 */
export async function setPhoneNumber(phone: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set(PHONE_COOKIE, phone, {
      httpOnly: true,
      secure: getCookieSecure(),
      sameSite: 'lax',
      maxAge: PHONE_MAX_AGE,
      path: '/',
    })
  } catch (error) {
    console.error('Failed to set phone number:', error)
    throw new Error('Failed to set phone number')
  }
}

/**
 * Telefonni cookie'dan o'qish
 */
export async function getPhoneNumber(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const phone = cookieStore.get(PHONE_COOKIE)?.value
    return phone || null
  } catch (error) {
    console.error('Failed to get phone number:', error)
    return null
  }
}

/**
 * Barcha auth cookies'larni o'chirish (logout)
 */
export async function clearAuthCookies(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(TOKEN_COOKIE)
    cookieStore.delete(PHONE_COOKIE)
  } catch (error) {
    console.error('Failed to clear auth cookies:', error)
    throw new Error('Failed to logout')
  }
}

/**
 * Foydalanuvchi authentifikatsiyalangan yoki yo'qligini tekshirish
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = await getSessionFromCookies(cookieStore)
  return session !== null
}
