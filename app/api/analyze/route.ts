import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'
import { analyzeSchema } from '@/lib/validations'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * POST /api/analyze
 * Starts a background analysis job on the backend and returns {status, job_id}.
 * The client polls GET /api/analyze/status/[jobId] until status === "done".
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json(
        { detail: 'Authentifikatsiya talab qilinadi' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = analyzeSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { detail: 'Validatsiya xatoligi', errors: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { phone, chat_id, limit } = validationResult.data

    const response = await fetch(`${BACKEND_URL}/analyze/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone, chat_id, limit }),
    })

    if (response.status === 401) {
      const res = NextResponse.json(
        { detail: "Sessiyaning muddati tugagan. Qayta kirib o'ting." },
        { status: 401 }
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
  } catch (error) {
    console.error('Analyze start error:', error)
    return NextResponse.json(
      { detail: 'Chat tahlilini boshlashda xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
