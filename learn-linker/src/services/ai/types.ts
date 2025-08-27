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
  default: `你是一个专业的编程助手。请用中文清晰、简洁地解释代码。
重点关注：
1. 代码的功能和作用
2. 代码的工作原理
3. 使用的关键概念和模式
4. 潜在问题或改进建议

请提供有教育意义的解释，帮助开发者更好地理解代码。`,
  
  concise: `你是一个编程助手。请用中文简短、直接地解释代码。
只关注最重要的方面。尽可能保持回答在5句话以内。`,
  
  detailed: `你是一个专业的编程导师。请用中文提供全面的代码解释，包括：
- 必要时逐行分析
- 底层概念和理论
- 最佳实践和替代方案
- 常见陷阱及如何避免`,
  
  tutorial: `你是一个友好的编程老师。请用中文像教学生一样解释代码：
- 从整体概览开始
- 分解复杂部分
- 适当使用类比
- 提供示例和练习`
};