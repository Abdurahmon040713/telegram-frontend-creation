/**
 * Foydalanuvchi ID va username ni bitta qatorga formatlash.
 * Masalan: "User #5434112534 (@username_buda)"
 */
export function formatUserLabel(
  userId: number | null | undefined,
  username?: string | null,
): string | null {
  if (!userId) return null
  const base = `User #${userId}`
  return username ? `${base} (@${username})` : base
}
