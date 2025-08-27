/**
 * OpenAI Provider Implementation
 * 
 * This provider implements the AIProvider interface for OpenAI's GPT models.
 * It supports streaming responses and handles OpenAI-specific API requirements.
 */

import { Logger } from '../../../utils/logger';
import {
  AIProvider,
  OpenAIConfig,
  CodeContext,
  ExplainOptions,
  AIProviderError,
  AIProviderErrorCode,
  DEFAULT_CONFIGS,
  SYSTEM_PROMPTS
} from '../types';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export class OpenAIProvider implements AIProvider {
  private logger: Logger;
  private config: OpenAIConfig;
  private apiBase: string;
  private model: string;

  constructor(config: OpenAIConfig) {
    this.logger = Logger.getInstance();
    this.config = config;
    this.apiBase = config.apiBase || DEFAULT_CONFIGS.openai.apiBase!;
    this.model = config.model || DEFAULT_CONFIGS.openai.model!;
    
    // Ensure API base ends without trailing slash
    if (this.apiBase.endsWith('/')) {
      this.apiBase = this.apiBase.slice(0, -1);
    }
    
    this.logger.info(`OpenAI Provider initialized with model: ${this.model}`);
  }

  async explainCode(
    code: string,
    context?: CodeContext,
    options?: ExplainOptions
  ): Promise<ReadableStream<string>> {
    try {
      this.logger.debug('OpenAI: Starting code explanation', {
        codeLength: code.length,
        language: context?.language,
        style: options?.style
      });

      const messages = this.buildMessages(code, context, options);
      const request: OpenAIRequest = {
        model: this.model,
        messages,
        stream: true,
        temperature: this.config.temperature || DEFAULT_CONFIGS.openai.temperature,
        max_tokens: this.config.maxTokens || DEFAULT_CONFIGS.openai.maxTokens
      };

      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new AIProviderError(
          'No response body received from OpenAI',
          AIProviderErrorCode.INVALID_REQUEST,
          'openai'
        );
      }

      // Create a transform stream to parse SSE data
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      return new ReadableStream<string>({
        async start(controller) {
          let buffer = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                controller.close();
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.trim() === 'data: [DONE]') {
                  controller.close();
                  return;
                }

                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6)) as OpenAIStreamChunk;
                    const content = data.choices[0]?.delta?.content;
                    
                    if (content) {
                      controller.enqueue(content);
                    }
                  } catch (error) {
                    Logger.getInstance().warn('Failed to parse OpenAI stream chunk', error);
                  }
                }
              }
            }
          } catch (error) {
            const aiError = error instanceof AIProviderError ? error : new AIProviderError(
              'Stream processing error',
              AIProviderErrorCode.UNKNOWN,
              'openai',
              error
            );
            controller.error(aiError);
          }
        }
      });
    } catch (error) {
      this.logger.error('OpenAI Provider error:', error);
      
      if (error instanceof AIProviderError) {
        throw error;
      }
      
      throw new AIProviderError(
        'Failed to explain code with OpenAI',
        AIProviderErrorCode.UNKNOWN,
        'openai',
        error
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      this.logger.debug('Testing OpenAI connection...');
      
      const response = await fetch(`${this.apiBase}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        this.logger.info('OpenAI connection test successful');
        return true;
      }

      if (response.status === 401) {
        this.logger.error('OpenAI API key is invalid');
        return false;
      }

      this.logger.warn(`OpenAI connection test returned status: ${response.status}`);
      return false;
    } catch (error) {
      this.logger.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  getProviderInfo() {
    return {
      name: 'OpenAI',
      version: 'v1',
      model: this.model,
      capabilities: [
        'streaming',
        'code-explanation',
        'multi-language',
        'context-aware'
      ]
    };
  }

  private buildMessages(
    code: string,
    context?: CodeContext,
    options?: ExplainOptions
  ): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    // Add system prompt based on style
    const style = options?.style || 'default';
    const systemPrompt = SYSTEM_PROMPTS[style] || SYSTEM_PROMPTS.default;
    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // Build user prompt
    let userPrompt = '';
    
    if (context?.language) {
      userPrompt += `编程语言: ${context.language}\n`;
    }
    
    if (context?.fileName) {
      userPrompt += `文件名: ${context.fileName}\n`;
    }
    
    if (context?.lineRange) {
      userPrompt += `行号: ${context.lineRange.start}-${context.lineRange.end}\n`;
    }
    
    if (options?.focusAreas?.length) {
      userPrompt += `重点关注: ${options.focusAreas.join(', ')}\n`;
    }
    
    userPrompt += `\n请解释下面的代码:\n\`\`\`${context?.language || ''}\n${code}\n\`\`\``;
    
    if (context?.additionalContext) {
      userPrompt += `\n\n补充信息: ${context.additionalContext}`;
    }

    messages.push({
      role: 'user',
      content: userPrompt
    });

    return messages;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
    let errorCode = AIProviderErrorCode.UNKNOWN;
    let details: any = {};

    try {
      const errorData = await response.json() as any;
      if (errorData.error) {
        errorMessage = errorData.error.message || errorMessage;
        details = errorData.error;
        
        // Map OpenAI error types to our error codes
        if (response.status === 401) {
          errorCode = AIProviderErrorCode.INVALID_API_KEY;
        } else if (response.status === 429) {
          errorCode = AIProviderErrorCode.RATE_LIMIT;
        } else if (response.status === 400) {
          errorCode = AIProviderErrorCode.INVALID_REQUEST;
        } else if (response.status === 404) {
          errorCode = AIProviderErrorCode.MODEL_NOT_FOUND;
        } else if (response.status >= 500) {
          errorCode = AIProviderErrorCode.NETWORK_ERROR;
        }
      }
    } catch {
      // Ignore JSON parsing errors
    }

    this.logger.error(`OpenAI API Error [${errorCode}]:`, errorMessage, details);
    
    throw new AIProviderError(
      errorMessage,
      errorCode,
      'openai',
      details
    );
  }
}