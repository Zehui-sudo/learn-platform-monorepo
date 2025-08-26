import { AIProvider, ChatRequest, ChatResponse } from '../types';
import { ChatMessage } from '@/types';

export class AnthropicProvider extends AIProvider {
  private apiKey: string;
  private model: string;
  private apiBase: string;

  constructor() {
    super();
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';
    this.apiBase = process.env.ANTHROPIC_API_BASE || 'https://api.anthropic.com/v1';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getDefaultModel(): string {
    return this.model;
  }

  private formatMessages(messages: ChatMessage[]) {
    // Anthropic requires alternating user/assistant messages
    const formatted: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    for (const msg of messages) {
      formatted.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
    
    return formatted;
  }

  private _createParserStream(stream: ReadableStream): ReadableStream {
    const decoder = new TextDecoder();
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        // Anthropic sends events that can be parsed line by line
        const lines = text.split('\n').filter(line => line.trim().length > 0);

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const jsonStr = line.replace(/^data: /, '');
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta?.text;
                if (delta) {
                  controller.enqueue(new TextEncoder().encode(delta));
                }
              } else if (parsed.type === 'message_stop') {
                controller.terminate();
                return;
              }
            } catch {
              console.error('Failed to parse Anthropic stream chunk:', jsonStr);
            }
          }
        }
      }
    });
    
    return stream.pipeThrough(transformStream);
  }

  async chat(request: ChatRequest): Promise<ChatResponse | ReadableStream> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic API key not configured');
    }

    const { messages, model = this.model, temperature = 0.7, maxTokens = 2000, contextReference, stream = false } = request;

    const formattedMessages = this.formatMessages(messages);
    
    // Add context as a system message if provided
    let systemMessage = '';
    if (contextReference) {
      systemMessage = `Context from ${contextReference.source}: ${contextReference.text}\n\n`;
    }

    try {
      const response = await fetch(`${this.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          system: systemMessage,
          temperature,
          max_tokens: maxTokens,
          stream,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
      }

      if (stream) {
        if (!response.body) {
          throw new Error('Response body is null for streaming request');
        }
        return this._createParserStream(response.body);
      }

      const data = await response.json();
      
      return {
        content: data.content[0].text,
        provider: 'anthropic',
        model,
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }
}