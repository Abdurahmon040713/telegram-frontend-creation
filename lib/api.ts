// API Configuration
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Token management utilities
export const tokenUtils = {
  getToken: (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("telegram_token")
    }
    return null
  },
  setToken: (token: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem("telegram_token", token)
    }
  },
  removeToken: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("telegram_token")
    }
  },
  getPhone: (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("telegram_phone")
    }
    return null
  },
  setPhone: (phone: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem("telegram_phone", phone)
    }
  },
  removePhone: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("telegram_phone")
    }
  },
}

// API helper function
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenUtils.getToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
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
    apiRequest<{ status: string; phone_code_hash?: string; message: string }>("/login", {
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
    apiRequest<{ status: string; message: string }>("/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

// Chats API
export const chatsApi = {
  getChats: (phone: string) =>
    apiRequest<{ chats: Chat[] }>(`/chats?phone=${encodeURIComponent(phone)}`, {
      method: "POST",
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
