import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'
import { analyzeSchema } from '@/lib/validations'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * POST /api/analyze
 * Chat'ni tahlil qilish (AI sentiment analysis)
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
    const validationResult = analyzeSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          detail: 'Validatsiya xatoligi',
          errors: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { phone, chat_id, limit } = validationResult.data

    // Backend'ga token bilan tahlil so'rovini yuborish
    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone,
        chat_id,
        limit,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Xatolik yuz berdi' }))
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Analyze API error:', error)
    return NextResponse.json(
      { detail: 'Chat tahlilida xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
