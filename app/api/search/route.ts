import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'
import { z } from 'zod'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

const searchSchema = z.object({
  phone: z.string().min(1),
  query: z.string().min(2, 'Qidiruv so\'zi kamida 2 belgi'),
  chat_id: z.number().int().optional(),
  negative_only: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(50),
})

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
    const result = searchSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { detail: 'Validatsiya xatoligi', errors: result.error.issues },
        { status: 400 }
      )
    }

    const response = await fetch(`${BACKEND_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(result.data),
      signal: AbortSignal.timeout(10_000),
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
    console.error('Search error:', error)
    return NextResponse.json(
      { detail: 'Qidiruvda xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
