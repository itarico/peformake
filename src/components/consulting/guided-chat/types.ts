export type ChatType = 'campaign' | 'social_media' | 'design' | 'video';

export interface ChatParam {
  key: string;
  label: string;
  options: string[];
}

export interface ChatConfig {
  type: ChatType;
  title: string;
  description: string;
  icon: string;
  initialMessage: string;
  params: ChatParam[];
  quickPrompts: { label: string; prompt: string }[];
  generateLabel: string;
  generatePrompt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  aiProvider?: 'lovable' | 'openrouter';
  hasResearch?: boolean;
}

export interface ClientContext {
  name: string;
  segment?: string;
  description?: string;
  audience?: string;
  valueProposition?: string;
  monthlyFocus?: string;
}
