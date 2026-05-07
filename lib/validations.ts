import { z } from 'zod'

// Login validation schema
export const loginSchema = z.object({
  phone: z
    .string()
    .min(1, 'Telefon raqam talab qilinadi')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Noto\'g\'ri telefon raqam formati'),
})

// Verification code validation schema
export const verifySchema = z.object({
  code: z
    .string()
    .min(5, 'Tasdiqlash kodi kamida 5 ta raqam')
    .max(6, 'Tasdiqlash kodi ko\'pi bilan 6 ta raqam')
    .regex(/^\d+$/, 'Faqat raqamlardan iborat bo\'lishi kerak'),
})

// Chat analysis validation schema
export const analyzeSchema = z.object({
  phone: z
    .string()
    .min(1, 'Telefon raqam talab qilinadi')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Noto\'g\'ri telefon raqam formati'),
  chat_id: z
    .number()
    .int('Chat ID butun son bo\'lishi kerak')
    .positive('Chat ID musbat bo\'lishi kerak'),
  limit: z
    .number()
    .int()
    .min(1, 'Limit kamida 1 bo\'lishi kerak')
    .max(1000, 'Limit ko\'pi bilan 1000 bo\'lishi kerak')
    .default(50),
})

// Get chats validation schema
export const chatsSchema = z.object({
  phone: z
    .string()
    .min(1, 'Telefon raqam talab qilinadi')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Noto\'g\'ri telefon raqam formati'),
})

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>
export type VerifyFormData = z.infer<typeof verifySchema>
export type AnalyzeFormData = z.infer<typeof analyzeSchema>
export type ChatsFormData = z.infer<typeof chatsSchema>