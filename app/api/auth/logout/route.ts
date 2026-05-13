import { NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 * Auth cookie'larni o'chirish.
 *
 * MUHIM: cookies() Server Action'i Route Handler'dan chaqirilganda
 * Set-Cookie header NextResponse'ga qo'shilmaydi. Shuning uchun
 * cookie'lar to'g'ridan-to'g'ri NextResponse.cookies.delete() orqali o'chiriladi.
 */
export async function POST() {
  try {
    const response = NextResponse.json(
      { status: 'success', message: 'Logout muvaffaqiyatli bajarildi' }
    )

    response.cookies.delete('telegram_token')
    response.cookies.delete('telegram_phone')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { detail: 'Logout jarayonida xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
