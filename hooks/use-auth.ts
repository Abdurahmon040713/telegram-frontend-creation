import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Custom hook foydalanuvchi authentifikatsiya bilan ishlash uchun
 */
export function useAuth() {
  const router = useRouter()

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [router])

  const getPhone = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/phone', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        return data.phone
      }
      return null
    } catch (error) {
      console.error('Get phone error:', error)
      return null
    }
  }, [])

  return { logout, getPhone }
}
