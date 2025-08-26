import { OpenAIProvider } from './openai';
import { ChatRequest, ChatResponse } from '../types';

export class DeepSeekProvider extends OpenAIProvider {
  constructor() {
    super();
    // Override with DeepSeek specific settings
    this.apiKey = process.env.DEEPSEEK_API_KEY || 'sk-8102e40a3ccb42b9a40ea6ab8467530b';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.apiBase = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1';
  }

  isConfigured(): boolean {
    return !!process.env.DEEPSEEK_API_KEY;
  }

  async chat(request: ChatRequest): Promise<ChatResponse | ReadableStream> {
    // DeepSeek uses OpenAI-compatible API, so we can call the parent method
    const response = await super.chat(request);

    // If the response is a stream, we don't need to modify it.
    if (response instanceof ReadableStream) {
      return response;
    }

    // If it's a regular response, update the provider field.
    return {
      ...response,
      provider: 'deepseek',
    };
  }
}