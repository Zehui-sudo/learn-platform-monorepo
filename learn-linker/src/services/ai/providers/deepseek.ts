/**
 * DeepSeek Provider Implementation
 * 
 * This provider implements the AIProvider interface for DeepSeek's models.
 * DeepSeek uses an OpenAI-compatible API, so this implementation extends
 * the OpenAI provider with DeepSeek-specific configurations.
 */

import { Logger } from '../../../utils/logger';
import {
  AIProvider,
  DeepSeekConfig,
  CodeContext,
  ExplainOptions,
  AIProviderError,
  AIProviderErrorCode,
  DEFAULT_CONFIGS,
  SYSTEM_PROMPTS
} from '../types';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface DeepSeekStreamChunk {
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

export class DeepSeekProvider implements AIProvider {
  private logger: Logger;
  private config: DeepSeekConfig;
  private apiBase: string;
  private model: string;

  constructor(config: DeepSeekConfig) {
    this.logger = Logger.getInstance();
    this.config = config;
    this.apiBase = config.apiBase || DEFAULT_CONFIGS.deepseek.apiBase!;
    this.model = config.model || DEFAULT_CONFIGS.deepseek.model!;
    
    // Ensure API base ends without trailing slash
    if (this.apiBase.endsWith('/')) {
      this.apiBase = this.apiBase.slice(0, -1);
    }
    
    this.logger.info(`DeepSeek Provider initialized with model: ${this.model}`);
  }

  async explainCode(
    code: string,
    context?: CodeContext,
    options?: ExplainOptions
  ): Promise<ReadableStream<string>> {
    try {
      this.logger.debug('DeepSeek: Starting code explanation', {
        codeLength: code.length,
        language: context?.language,
        style: options?.style
      });

      const messages = this.buildMessages(code, context, options);
      const request: DeepSeekRequest = {
        model: this.model,
        messages,
        stream: true,
        temperature: this.config.temperature || DEFAULT_CONFIGS.deepseek.temperature,
        max_tokens: this.config.maxTokens || DEFAULT_CONFIGS.deepseek.maxTokens,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0
      };

      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new AIProviderError(
          'No response body received from DeepSeek',
          AIProviderErrorCode.INVALID_REQUEST,
          'deepseek'
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
                    const data = JSON.parse(line.slice(6)) as DeepSeekStreamChunk;
                    const content = data.choices[0]?.delta?.content;
                    
                    if (content) {
                      controller.enqueue(content);
                    }
                  } catch (error) {
                    Logger.getInstance().warn('Failed to parse DeepSeek stream chunk', error);
                  }
                }
              }
            }
          } catch (error) {
            const aiError = error instanceof AIProviderError ? error : new AIProviderError(
              'Stream processing error',
              AIProviderErrorCode.UNKNOWN,
              'deepseek',
              error
            );
            controller.error(aiError);
          }
        }
      });
    } catch (error) {
      this.logger.error('DeepSeek Provider error:', error);
      
      if (error instanceof AIProviderError) {
        throw error;
      }
      
      throw new AIProviderError(
        'Failed to explain code with DeepSeek',
        AIProviderErrorCode.UNKNOWN,
        'deepseek',
        error
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      this.logger.debug('Testing DeepSeek connection...');
      
      // DeepSeek uses a simple chat completions test
      const testRequest = {
        model: this.model,
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        stream: false,
        max_tokens: 1
      };

      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testRequest),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        this.logger.info('DeepSeek connection test successful');
        return true;
      }

      if (response.status === 401) {
        this.logger.error('DeepSeek API key is invalid');
        return false;
      }

      this.logger.warn(`DeepSeek connection test returned status: ${response.status}`);
      return false;
    } catch (error) {
      this.logger.error('DeepSeek connection test failed:', error);
      return false;
    }
  }

  getProviderInfo() {
    return {
      name: 'DeepSeek',
      version: 'v1',
      model: this.model,
      capabilities: [
        'streaming',
        'code-explanation',
        'multi-language',
        'context-aware',
        'cost-effective',
        'code-optimized'
      ]
    };
  }

  private buildMessages(
    code: string,
    context?: CodeContext,
    options?: ExplainOptions
  ): DeepSeekMessage[] {
    const messages: DeepSeekMessage[] = [];

    // Add system prompt based on style
    // DeepSeek performs well with code-specific instructions
    const style = options?.style || 'default';
    let systemPrompt = SYSTEM_PROMPTS[style] || SYSTEM_PROMPTS.default;
    
    // Add DeepSeek-specific optimizations
    systemPrompt += '\n\n注意：你是DeepSeek，专门优化用于代码理解和解释。' +
                   '请充分利用你对编程概念和最佳实践的深入理解。记住：请使用中文回答。';

    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // Build user prompt with DeepSeek-specific formatting
    let userPrompt = '';
    
    if (context?.language) {
      userPrompt += `编程语言: ${context.language}\n`;
    }
    
    if (context?.fileName) {
      userPrompt += `文件名: ${context.fileName}\n`;
    }
    
    if (context?.lineRange) {
      userPrompt += `行号范围: ${context.lineRange.start}-${context.lineRange.end}\n`;
    }
    
    if (context?.projectType) {
      userPrompt += `项目类型: ${context.projectType}\n`;
    }
    
    if (options?.focusAreas?.length) {
      userPrompt += `重点关注: ${options.focusAreas.join(', ')}\n`;
    }
    
    userPrompt += `\n=== 需要解释的代码 ===\n\`\`\`${context?.language || ''}\n${code}\n\`\`\``;
    
    if (context?.additionalContext) {
      userPrompt += `\n\n=== 补充信息 ===\n${context.additionalContext}`;
    }
    
    // Add specific instructions for DeepSeek
    userPrompt += '\n\n请用中文提供清晰且有教育意义的代码解释，' +
                  '重点说明代码的目的、实现细节以及使用的任何显著模式或技术。';

    messages.push({
      role: 'user',
      content: userPrompt
    });

    return messages;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `DeepSeek API error: ${response.status} ${response.statusText}`;
    let errorCode = AIProviderErrorCode.UNKNOWN;
    let details: any = {};

    try {
      const errorData = await response.json() as any;
      if (errorData.error) {
        errorMessage = errorData.error.message || errorMessage;
        details = errorData.error;
        
        // Map DeepSeek error types to our error codes
        if (response.status === 401) {
          errorCode = AIProviderErrorCode.INVALID_API_KEY;
          errorMessage = 'Invalid DeepSeek API key. Please check your configuration.';
        } else if (response.status === 429) {
          errorCode = AIProviderErrorCode.RATE_LIMIT;
          errorMessage = 'DeepSeek rate limit exceeded. Please try again later.';
        } else if (response.status === 400) {
          errorCode = AIProviderErrorCode.INVALID_REQUEST;
        } else if (response.status === 404) {
          errorCode = AIProviderErrorCode.MODEL_NOT_FOUND;
          errorMessage = `Model "${this.model}" not found. Please check your configuration.`;
        } else if (response.status >= 500) {
          errorCode = AIProviderErrorCode.NETWORK_ERROR;
          errorMessage = 'DeepSeek service error. Please try again later.';
        }
      }
    } catch {
      // Ignore JSON parsing errors
    }

    this.logger.error(`DeepSeek API Error [${errorCode}]:`, errorMessage, details);
    
    throw new AIProviderError(
      errorMessage,
      errorCode,
      'deepseek',
      details
    );
  }
}