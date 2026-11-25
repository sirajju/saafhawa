import { z } from 'zod';
import { PlanRequestSchema } from '../plan/types';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().trim().min(1).max(500),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.preprocess(
  (input: unknown) => {
    if (input && typeof input === 'object') {
      const obj = input as Record<string, unknown>;
      if (!obj.message && Array.isArray(obj.messages) && obj.messages.length > 0) {
        const last = obj.messages[obj.messages.length - 1] as { content?: string };
        const history = obj.messages.slice(0, -1);
        return {
          ...obj,
          message: typeof last?.content === 'string' ? last.content : '',
          conversationHistory: obj.conversationHistory ?? history,
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
      .max(500, 'Message cannot exceed 500 characters'),
    place: z
      .string()
      .trim()
      .min(2, 'Place name or pincode must be at least 2 characters')
      .max(120, 'Place cannot exceed 120 characters')
      .default('110001'),
    householdProfile: PlanRequestSchema.optional(),
    conversationHistory: z.array(ChatMessageSchema).max(8).optional().default([]),
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
}
