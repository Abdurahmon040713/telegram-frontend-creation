import { NextResponse } from 'next/server'
import { getPhoneNumber } from '@/app/actions/auth-action'

/**
 * GET /api/auth/phone
 * Hozirgi foydalanuvchining telefonini olish
 */
export async function GET() {
  try {
    const phone = await getPhoneNumber()

    if (!phone) {
      return NextResponse.json(
        { detail: 'Telefon topilmadi' },
        { status: 404 }
      )
    }

    return NextResponse.json({ phone })
  } catch (error) {
    console.error('Get phone error:', error)
    return NextResponse.json(
      { detail: 'Telefonni olishda xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
