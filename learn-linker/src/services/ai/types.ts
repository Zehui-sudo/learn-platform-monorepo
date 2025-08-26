/**
 * AI Provider Types and Interfaces
 * 
 * This module defines the core types and interfaces for the AI service layer.
 * It provides a unified abstraction over different AI providers (OpenAI, Anthropic, DeepSeek, etc.)
 */

// Provider types
export type AIProviderType = 'openai' | 'anthropic' | 'deepseek' | 'doubao';

// Configuration interfaces
export interface BaseAIConfig {
  provider: AIProviderType;
  apiKey: string;
  apiBase?: string;
  model?: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface OpenAIConfig extends BaseAIConfig {
  provider: 'openai';
  model?: string; // Default: gpt-4o-mini
  apiBase?: string; // Default: https://api.openai.com/v1
}

export interface AnthropicConfig extends BaseAIConfig {
  provider: 'anthropic';
  model?: string; // Default: claude-3-sonnet-20240229
  apiBase?: string; // Default: https://api.anthropic.com/v1
}

export interface DeepSeekConfig extends BaseAIConfig {
  provider: 'deepseek';
  model?: string; // Default: deepseek-chat
  apiBase?: string; // Default: https://api.deepseek.com/v1
}

export interface DoubaoConfig extends BaseAIConfig {
  provider: 'doubao';
  model?: string; // Default: doubao-lite-4k
  apiBase?: string; // Default: https://ark.cn-beijing.volces.com/api/v3
}

export type AIConfig = OpenAIConfig | AnthropicConfig | DeepSeekConfig | DoubaoConfig;

// Code context for better explanations
export interface CodeContext {
  language?: string;
  fileName?: string;
  filePath?: string;
  lineRange?: {
    start: number;
    end: number;
  };
  additionalContext?: string;
  projectType?: string;
}

// Options for code explanation
export interface ExplainOptions {
  language?: string;
  fileName?: string;
  additionalContext?: string;
  style?: 'concise' | 'detailed' | 'tutorial';
  focusAreas?: string[];
}

// Response types
export interface ExplanationResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  provider?: AIProviderType;
}

// Streaming response chunk
export interface StreamChunk {
  type: 'content' | 'error' | 'done';
  content?: string;
  error?: string;
  isFirst?: boolean;
  isLast?: boolean;
}

// AI Provider interface - all providers must implement this
export interface AIProvider {
  /**
   * Explain code with streaming response
   */
  explainCode(
    code: string,
    context?: CodeContext,
    options?: ExplainOptions
  ): Promise<ReadableStream<string>>;

  /**
   * Test provider connectivity and authentication
   */
  testConnection(): Promise<boolean>;

  /**
   * Get provider information
   */
  getProviderInfo(): {
    name: string;
    version?: string;
    model: string;
    capabilities: string[];
  };
}

// Error types
export class AIProviderError extends Error {
  constructor(
    message: string,
    public code: AIProviderErrorCode,
    public provider?: AIProviderType,
    public details?: any
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export enum AIProviderErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

// Helper type guards
export function isOpenAIConfig(config: AIConfig): config is OpenAIConfig {
  return config.provider === 'openai';
}

export function isAnthropicConfig(config: AIConfig): config is AnthropicConfig {
  return config.provider === 'anthropic';
}

export function isDeepSeekConfig(config: AIConfig): config is DeepSeekConfig {
  return config.provider === 'deepseek';
}

export function isDoubaoConfig(config: AIConfig): config is DoubaoConfig {
  return config.provider === 'doubao';
}

// Default configurations
export const DEFAULT_CONFIGS: Record<AIProviderType, Partial<BaseAIConfig>> = {
  openai: {
    model: 'gpt-4o-mini',
    apiBase: 'https://api.openai.com/v1',
    temperature: 0.7,
    maxTokens: 2000
  },
  anthropic: {
    model: 'claude-3-sonnet-20240229',
    apiBase: 'https://api.anthropic.com/v1',
    temperature: 0.7,
    maxTokens: 2000
  },
  deepseek: {
    model: 'deepseek-chat',
    apiBase: 'https://api.deepseek.com/v1',
    temperature: 0.7,
    maxTokens: 2000
  },
  doubao: {
    model: 'doubao-lite-4k',
    apiBase: 'https://ark.cn-beijing.volces.com/api/v3',
    temperature: 0.7,
    maxTokens: 4000
  }
};

// System prompts for code explanation
export const SYSTEM_PROMPTS = {
  default: `You are an expert programming assistant. Your task is to explain code clearly and concisely. 
Focus on:
1. What the code does
2. How it works
3. Key concepts and patterns used
4. Potential issues or improvements

Provide explanations that are educational and help developers understand the code better.`,
  
  concise: `You are a programming assistant. Provide brief, to-the-point explanations of code. 
Focus only on the most important aspects. Keep responses under 5 sentences when possible.`,
  
  detailed: `You are an expert programming tutor. Provide comprehensive explanations of code including:
- Line-by-line breakdown when helpful
- Underlying concepts and theory
- Best practices and alternatives
- Common pitfalls and how to avoid them`,
  
  tutorial: `You are a friendly programming teacher. Explain code as if teaching a student:
- Start with the big picture
- Break down complex parts
- Use analogies when helpful
- Provide examples and exercises`
};