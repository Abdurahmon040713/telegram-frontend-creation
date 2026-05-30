// HTTP status kodi bilan xato — useApiError.ts da to'g'ri aniqlanishi uchun
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// API Configuration
// Eslatma: Vercel/Render ga yuklaganda BACKEND_URL ni server URL manziliga o'zgartirasiz.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"
const API_BASE_URL = "/api" // Next.js API routes orqali (httpOnly cookies bilan)

/**
 * Get absolute URL for Next.js API routes (server-side)
 */
function getAbsoluteUrl(endpoint: string): string {
  // Turbopack cache issues bilan mubaholash
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${baseUrl}${API_BASE_URL}${endpoint}`
}

/**
 * Client-side API request helper
 * Barcha so'rovlar Next.js API routes orqali o'tadi
 * (HttpOnly cookies avtomatik qatnashadi)
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Cookies yuborish
    })

    if (!response.ok) {
      let error: any
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        error = await response.json().catch(() => ({ detail: "Xatolik yuz berdi" }))
      } else {
        error = { detail: `HTTP error! status: ${response.status}` }
      }
      
      console.error(`API Error [${response.status}]:`, error)
      throw new ApiError(response.status, error.detail || `HTTP error! status: ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      throw new Error('Noto\'g\'ri javob formati: JSON kutilgan')
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Network error:', error)
      throw new Error('Tarmoq xatoligi. Iltimos, Internet ulanishini tekshiring.')
    }
    throw error
  }
}

/**
 * Server-side API request (only for server components and API routes)
 * HttpOnly cookies va token bilan backend'ga so'rov yuboradi
 */
export async function serverApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Xatolik yuz berdi" }))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * Phone raqamini cookie'dan o'qish (server-side faqat)
 * Client'da bu funksiya ishlamaydi - API route orqali o'qing
 */
export async function getPhoneFromCookie(): Promise<string | null> {
  try {
    const { getPhoneNumber } = await import('@/app/actions/auth-action')
    return await getPhoneNumber()
  } catch {
    return null
  }
}

/**
 * Server-side fetch for Next.js API routes (absolute URL bilan)
 */
export async function serverFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const absoluteUrl = getAbsoluteUrl(endpoint)
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  const response = await fetch(absoluteUrl, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Xatolik yuz berdi" }))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// Auth API
export const authApi = {
  login: (data: { api_id: number; api_hash: string; phone: string }) =>
    apiRequest<{ status: string; phone_code_hash: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verify: (data: {
    phone: string
    code: string
    phone_code_hash: string
    api_id: number
    api_hash: string
  }) =>
    apiRequest<{ status: string; message?: string }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

// Chats API
export const chatsApi = {
  // XATOLIK TO'G'RILANDI: phone ni query string (URL) dan olib, Body (JSON) ga o'tkazdik
  getChats: (phone: string) =>
    apiRequest<{ chats: Chat[] }>("/chats", {
      method: "POST",
      body: JSON.stringify({ phone: phone }),
    }),
}

// Analyze API
export const analyzeApi = {
  analyze: (data: { phone: string; chat_id: number; limit?: number }) =>
    apiRequest<AnalyzeResponse>("/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

// Monitor API
export const monitorApi = {
  start: (data: { phone: string; chat_id: number }) =>
    apiRequest<{ status: string; chat_id: number }>("/monitor/start", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  stop: (data: { phone: string; chat_id: number }) =>
    apiRequest<{ status: string; chat_id: number }>("/monitor/stop", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  status: () =>
    apiRequest<{ phone: string; monitored_chats: number[] }>("/monitor/status"),

  getViolations: (chatId: number) =>
    apiRequest<{ chat_id: number; violations: ViolationRecord[] }>(`/violations/${chatId}`),
}

// Types
export interface Chat {
  id: number
  title: string
  type: "Private" | "Group" | "Channel"
}

export interface NegativeMessage {
  id: number
  text: string
  confidence: number
  sender_id: number | null
  reason: 'keyword_match' | 'ai_sentiment'
}

export interface AnalyzeResponse {
  analyzed_count: number
  negative_count: number
  negative_messages: NegativeMessage[]
}

export interface User {
  phone: string
  api_id: number
  api_hash: string
}

export interface ViolationRecord {
  user_id:    number
  warn_count: number
  is_muted:   boolean
  is_banned:  boolean
  muted_until: string | null
}