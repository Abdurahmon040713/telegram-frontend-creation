import type { BannedListResponse, BannedUser } from "@/lib/api"

/**
 * Backend javobini frontend formatiga keltiradi.
 * Ba'zan eski endpoint faqat massiv qaytarishi mumkin — shunda ham ishlaydi.
 */
export function normalizeBannedResponse(
  data: unknown,
  chatId: number,
): BannedListResponse {
  if (Array.isArray(data)) {
    return {
      chat_id: chatId,
      restriction_mode: false,
      banned_users: data as BannedUser[],
      count: data.length,
    }
  }

  const obj = data as Record<string, unknown>
  const users = Array.isArray(obj.banned_users)
    ? (obj.banned_users as BannedUser[])
    : []

  return {
    chat_id: typeof obj.chat_id === "number" ? obj.chat_id : chatId,
    restriction_mode: Boolean(obj.restriction_mode),
    banned_users: users,
    count: typeof obj.count === "number" ? obj.count : users.length,
  }
}