import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { ApiError } from '@/lib/api'

export function useApiError() {
  const router = useRouter()

  const handleError = useCallback(async (error: any) => {
    // ApiError — HTTP status kodi aniq (api.ts dan)
    if (error instanceof ApiError && error.status === 401) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch (logoutErr) {
        console.error('Logout error:', logoutErr)
      }
      router.push('/login')
      return "Sessiyaning muddati tugagan. Qayta kirib o'ting."
    }

    // Network errors (TypeError)
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      return "Internet ulanmasi yo'q. Iltimos, ulanishni tekshiring."
    }

    // Request cancelled (AbortController)
    if (error?.name === 'AbortError') {
      return 'So\'rov bekor qilindi'
    }

    return error?.message || 'Xatolik yuz berdi'
  }, [router])

  return { handleError }
}
