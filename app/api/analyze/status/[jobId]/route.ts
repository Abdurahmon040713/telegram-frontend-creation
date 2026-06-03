import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/app/actions/auth-action'

import { BACKEND_URL } from '@/lib/backend-url'

/**
 * GET /api/analyze/status/[jobId]
 * Polls the backend for the status of an async analysis job.
 *
 * Response shapes:
 *   { status: "queued" | "running" }
 *   { status: "done",  result: AnalyzeResponse }
 *   { status: "error", error: string }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json(
        { detail: 'Authentifikatsiya talab qilinadi' },
        { status: 401 }
      )
    }

    const { jobId } = await params

    const response = await fetch(`${BACKEND_URL}/analyze/status/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    console.error('Analyze status error:', error)
    return NextResponse.json(
      { detail: 'Tahlil holatini olishda xatolik yuz berdi' },
      { status: 500 }
    )
  }
}
