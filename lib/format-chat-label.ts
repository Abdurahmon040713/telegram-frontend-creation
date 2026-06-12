/**
 * Chat nomi va ID ni bitta qatorga formatlash.
 * Masalan: "BMI-101 Guruh (ID: -1003816898751)"
 */
export function formatChatLabel(
  chatId: number | null | undefined,
  title?: string | null,
): string {
  if (!chatId) return title?.trim() || "Noma'lum chat"
  const idPart = `ID: ${chatId}`
  const trimmed = title?.trim()
  return trimmed ? `${trimmed} (${idPart})` : `Chat #${chatId}`
}
