import { ChatMessage, ContextReference, SectionLink } from '@/types';

export type AIProviderType = 'openai' | 'anthropic' | 'deepseek' | 'doubao';

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  contextReference?: ContextReference;
  stream?: boolean;
  language?: 'python' | 'javascript';
}

export interface ChatResponse {
  content: string;
  provider: AIProviderType;
  model: string;
  linkedSections?: SectionLink[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export abstract class AIProvider {
  abstract chat(request: ChatRequest): Promise<ChatResponse | ReadableStream>;
  abstract getDefaultModel(): string;
  abstract isConfigured(): boolean;
}