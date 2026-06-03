/**
 * Moderatsiya API manzillari — backend bilan 1:1 mos.
 *
 * Backend (FastAPI):  {BACKEND_URL}/api/chats/{chat_id}/...
 * Next.js proxy:      /api/chats/[chatId]/...
 * Brauzer (client):   moderationClientPath → /api/chats/{chatId}/...  (apiRequest /api prefiks qo'shadi)
 */

/** Qora ro'yxat — query param (manfiy chat_id uchun ishonchli) */
export function moderationBannedClientPath(chatId: number | string): string {
  return `/chats/banned?chat_id=${encodeURIComponent(String(chatId))}`
}

export function moderationBannedBackendPath(chatId: number | string): string {
  return `/api/chats/banned?chat_id=${encodeURIComponent(String(chatId))}`
}

/** Next.js API route (client fetch) */
export function moderationClientPath(
  chatId: number | string,
  suffix: string,
): string {
  const id = encodeURIComponent(String(chatId))
  const path = suffix.startsWith("/") ? suffix : `/${suffix}`
  return `/chats/${id}${path}`
}

/** FastAPI to'g'ridan-to'g'ri (proxyToBackend) */
export function moderationBackendPath(
  chatId: number | string,
  suffix: string,
): string {
  const id = encodeURIComponent(String(chatId))
  const path = suffix.startsWith("/") ? suffix : `/${suffix}`
  return `/api/chats/${id}${path}`
}