import { type ChatMessage } from '../ChatMessageList';
import { type PlanRequest } from '@/lib/plan/types';

export interface ChatPanelProps {
  place: string;
  displayPlace?: string;
  householdProfile?: PlanRequest;
  dataSource?: string;
  measuredTime?: string;
  timeZone?: string;
  onClose?: () => void;
  className?: string;
  headingId?: string;
}

export const INITIAL_GREETING: ChatMessage[] = [
  {
    role: 'assistant',
    content:
      "Ask me about timing, masks, purifiers or your commute. I'll check the forecast first.",
    isGreeting: true,
  },
];

export const SAMPLE_PROMPTS = [
  'Can my daughter play outside at 5 PM?',
  'Is a DIY box-fan filter worth it?',
  "Metro or car for tomorrow's commute?",
];
