'use server'

import { cookies } from 'next/headers'

const TOKEN_NAME = 'telegram_token'
const PHONE_NAME = 'telegram_phone'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days

/**
 * Tokenni HttpOnly cookie'ga yozish
 * @param token - Saqlash uchun token
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set(TOKEN_NAME, token, {
      httpOnly: true,        // JavaScript orqali o'chib bo'lmaydi (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS orqali faqat
      sameSite: 'lax',       // CSRF protection
      maxAge: MAX_AGE,       // 7 kun
      path: '/',
    })
  } catch (error) {
    console.error('Failed to set auth token:', error)
    throw new Error('Failed to set authentication token')
  }
}

/**
 * Tokenni cookie'dan o'qish (server-side faqat)
 * @returns Token yoki null agar bo'lmasa
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(TOKEN_NAME)?.value
    return token || null
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return null
  }
}

/**
 * Telefonni cookie'ga yozish
 * @param phone - Saqlash uchun telefon raqami
 */
export async function setPhoneNumber(phone: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set(PHONE_NAME, phone, {
      httpOnly: true,        // Server action orqali o'qiladi — JS access kerak emas
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    })
  } catch (error) {
    console.error('Failed to set phone number:', error)
    throw new Error('Failed to set phone number')
  }
}

/**
 * Telefonni cookie'dan o'qish
 * @returns Telefon raqami yoki null
 */
export async function getPhoneNumber(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const phone = cookieStore.get(PHONE_NAME)?.value
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
    cookieStore.delete(TOKEN_NAME)
    cookieStore.delete(PHONE_NAME)
  } catch (error) {
    console.error('Failed to clear auth cookies:', error)
    throw new Error('Failed to logout')
  }
}

/**
 * Foydalanuvchi authentifikatsiyalangan yoki yo'qligini tekshirish
 * @returns true agar token mavjud bo'lsa
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken()
  return !!token
}
