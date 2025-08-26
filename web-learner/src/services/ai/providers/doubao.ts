import { AIProvider, ChatRequest, ChatResponse } from '../types';
import { ChatMessage } from '@/types';

export class DoubaoProvider extends AIProvider {
  private apiKey: string;
  private model: string;
  private apiBase: string;

  constructor() {
    super();
    this.apiKey = process.env.DOUBAO_API_KEY || '';
    this.model = process.env.DOUBAO_MODEL || 'doubao-lite-4k';
    this.apiBase = process.env.DOUBAO_API_BASE || 'https://maas-api.ml-platform-cn-beijing.volces.com';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getDefaultModel(): string {
    return this.model;
  }

  private formatMessages(messages: ChatMessage[]) {
    return messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
  }

  private _createParserStream(stream: ReadableStream): ReadableStream {
    const decoder = new TextDecoder();
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n').filter(line => line.trim().startsWith('data:'));
        
        for (const line of lines) {
          const jsonStr = line.replace(/^data: /, '');
          if (jsonStr === '[DONE]') {
            controller.terminate();
            return;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(new TextEncoder().encode(delta));
            }
          } catch {
            console.error('Failed to parse Doubao stream chunk:', jsonStr);
          }
        }
      }
    });

    return stream.pipeThrough(transformStream);
  }

  async chat(request: ChatRequest): Promise<ChatResponse | ReadableStream> {
    if (!this.isConfigured()) {
      throw new Error('Doubao API key not configured');
    }

    const { messages, model = this.model, temperature = 0.7, maxTokens = 2000, contextReference, stream = false } = request;

    let formattedMessages = this.formatMessages(messages);
    if (contextReference) {
      const contextMessage = {
        role: 'system',
        content: `参考上下文 (${contextReference.source}): ${contextReference.text}`
      };
      formattedMessages = [contextMessage, ...formattedMessages];
    }

    try {
      // Doubao API is similar to OpenAI format but with some differences
      const response = await fetch(`${this.apiBase}/api/v3/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
          stream,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Doubao API error: ${response.status}`);
      }

      if (stream) {
        if (!response.body) {
          throw new Error('Response body is null for streaming request');
        }
        return this._createParserStream(response.body);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        provider: 'doubao',
        model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error('Doubao API error:', error);
      throw error;
    }
  }
}