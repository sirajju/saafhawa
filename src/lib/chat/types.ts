import { z } from 'zod';
import { PlanRequestSchema } from '../plan/types';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().trim().min(1).max(500),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message cannot exceed 500 characters'),
  place: z
    .string()
    .trim()
    .min(2, 'Place name or pincode must be at least 2 characters')
    .max(120, 'Place cannot exceed 120 characters')
    .default('110001'),
  householdProfile: PlanRequestSchema.optional(),
  conversationHistory: z.array(ChatMessageSchema).max(8).optional().default([]),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface ExecutedToolRecord {
  toolName: string;
  args: Record<string, unknown>;
  resultSummary: string;
}

export interface ChatResponse {
  reply: string;
  toolsExecuted: ExecutedToolRecord[];
}
