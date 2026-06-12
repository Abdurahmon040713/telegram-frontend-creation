"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MessageReason } from "@/lib/api"

/** Filtr qiymati: barcha qatlamlar yoki bitta L1/L2/L3 */
export type ReasonFilterValue = "all" | MessageReason

/** Chip tugmalar ro'yxati — tahlil natijalarini client-side filtrlash uchun */
export const REASON_FILTER_OPTIONS: { value: ReasonFilterValue; label: string }[] = [
  { value: "all",            label: "Barchasi" },
  { value: "keyword_match",  label: "L1: Kalit so'z" },
  { value: "context_weight", label: "L2: Kontekst" },
  { value: "ai_sentiment",   label: "L3: AI Sentiment" },
]

/** Sabab bo'yicha badge uslublari — B&W minimal, yuqori kontrast */
const REASON_BADGE_STYLES: Record<MessageReason, { label: string; className: string }> = {
  keyword_match: {
    label: "Kalit so'z",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  context_weight: {
    label: "Kontekst",
    className: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  ai_sentiment: {
    label: "AI Tahlil",
    className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  },
}

/** Ishonch ballini foiz ko'rinishida formatlash (masalan 0.85 → "85% ishonch") */
export function formatConfidencePercent(confidence: number | null | undefined): string | null {
  if (confidence == null || confidence <= 0) return null
  return `${Math.round(confidence * 100)}% ishonch`
}

/** Xabarlarni reason maydoni bo'yicha client-side filtrlash */
export function filterMessagesByReason<T extends { reason: MessageReason }>(
  messages: T[],
  filter: ReasonFilterValue,
): T[] {
  if (filter === "all") return messages
  return messages.filter(m => m.reason === filter)
}

interface AnalysisReasonFilterChipsProps {
  value: ReasonFilterValue
  onChange: (value: ReasonFilterValue) => void
  className?: string
}

/** Tahlil natijalari ustidagi L1/L2/L3 chip filtrlari */
export function AnalysisReasonFilterChips({
  value,
  onChange,
  className,
}: AnalysisReasonFilterChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {REASON_FILTER_OPTIONS.map(opt => (
        <Button
          key={opt.value}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-7 rounded-lg px-2.5 text-xs font-normal border-border/60",
            value === opt.value && "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background",
          )}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

interface ReasonBadgeProps {
  reason: MessageReason | null | undefined
  /** Tahlil ro'yxatida qisqa L1/L2/L3 ko'rinishi */
  variant?: "short" | "full"
  className?: string
}

/** Aniqlash sababini badge ko'rinishida ko'rsatish */
export function ReasonBadge({ reason, variant = "full", className }: ReasonBadgeProps) {
  if (!reason) return null
  const style = REASON_BADGE_STYLES[reason]
  const label = variant === "short"
    ? (reason === "keyword_match" ? "Lug'at (L1)"
      : reason === "context_weight" ? "Kontekst (L2)"
      : "AI (L3)")
    : style.label

  return (
    <Badge
      variant="secondary"
      className={cn("text-[10px] border", style.className, className)}
    >
      {label}
    </Badge>
  )
}
