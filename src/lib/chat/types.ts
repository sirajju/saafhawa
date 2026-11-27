import { z } from 'zod';
import { PlanRequestSchema } from '../plan/types';
import { type FallbackReason } from '../constants';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z
    .string()
    .trim()
    .min(1)
    .transform((str) => (str.length > 1000 ? str.slice(0, 1000) : str)),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.preprocess(
  (input: unknown) => {
    if (input && typeof input === 'object') {
      const obj = input as Record<string, unknown>;
      if (!obj.message && Array.isArray(obj.messages) && obj.messages.length > 0) {
        const last = obj.messages[obj.messages.length - 1] as { content?: string };
        const rawHistory = obj.messages.slice(0, -1);
        return {
          ...obj,
          message: typeof last?.content === 'string' ? last.content : '',
          conversationHistory: obj.conversationHistory ?? rawHistory,
        };
      }
    }
    return input;
  },
  z.object({
    message: z
      .string()
      .trim()
      .min(1, 'Please enter a question')
      .max(500, 'Please provide a valid question under 500 characters.'),
    place: z
      .string()
      .trim()
      .min(2, 'Place name or pincode must be at least 2 characters')
      .max(120, 'Place cannot exceed 120 characters'),
    householdProfile: PlanRequestSchema.optional(),
    conversationHistory: z.array(ChatMessageSchema).max(12).optional().default([]),
  })
);

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface ExecutedToolRecord {
  toolName: string;
  args: Record<string, unknown>;
  resultSummary: string;
}

export interface ChatResponse {
  reply: string;
  toolsExecuted: ExecutedToolRecord[];
  fallbackReason?: FallbackReason;
  dailyQuotaResetTime?: string;
  modelUsed?: string;
}
