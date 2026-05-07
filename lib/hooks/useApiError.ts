import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function useApiError() {
  const router = useRouter()

  const handleError = useCallback(async (error: any) => {
    // Check for 401 Unauthorized
    if (error?.status === 401 || error?.message?.includes('401')) {
      try {
        // Attempt to clear cookies via logout endpoint
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch (logoutErr) {
        console.error('Logout error:', logoutErr)
      }
      
      // Redirect to login
      router.push('/login')
      return "Sessiyaning muddati tugagan. Qayta kirib o'ting."
    }

    // Check for network errors
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      return "Internet ulanmasi yo'q. Iltimos, ulanishni tekshiring."
    }

    // Check for AbortError (request cancelled)
    if (error?.name === 'AbortError') {
      return 'So\'rov bekor qilindi'
    }

    // Return custom message or default
    return error?.message || 'Xatolik yuz berdi'
  }, [router])

  return { handleError }
}
