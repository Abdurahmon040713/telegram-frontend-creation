import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/app/actions/auth-action'

/**
 * POST /api/auth/logout
 * Foydalanuvchini logout qilish (cookies o'chirish)
 */
export async function POST() {
  try {
    await clearAuthCookies()

    return NextResponse.json(
      { status: 'success', message: 'Logout muvaffaqiyatli bajarildi' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { detail: 'Logout jarayonida xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
