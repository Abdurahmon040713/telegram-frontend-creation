import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'
import { chatsSchema } from '@/lib/validations'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * POST /api/chats
 * Chat ro'yxatini olish (token bilan)
 */
export async function POST(request: NextRequest) {
  try {
    // Token'ni cookie'dan olish
    const token = await getAuthToken()

    if (!token) {
      return NextResponse.json(
        { detail: 'Authentifikatsiya talab qilinadi' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Zod validatsiyasi
    const validationResult = chatsSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          detail: 'Validatsiya xatoligi',
          errors: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { phone } = validationResult.data

    // Backend'ga token bilan so'rov yuborish
    const response = await fetch(`${BACKEND_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ phone }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Xatolik yuz berdi' }))
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Chats API error:', error)
    return NextResponse.json(
      { detail: 'Chat ro\'yxatini olishda xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
