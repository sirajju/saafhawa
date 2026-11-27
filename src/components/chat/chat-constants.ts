import { type ChatMessage } from '../ChatMessageList';
import { type HouseholdProfile } from '@/lib/impact/types';

export interface ChatPanelProps {
  place: string;
  displayPlace?: string;
  householdProfile?: HouseholdProfile;
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
  'What should I do right now to protect my family?',
  'Is it safe for morning walks tomorrow?',
  'How do I seal my home during peak smog?',
];
