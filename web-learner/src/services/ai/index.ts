import { AIProvider, AIProviderType } from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { DeepSeekProvider } from './providers/deepseek';
import { DoubaoProvider } from './providers/doubao';

export * from './types';

export function createAIProvider(type: AIProviderType): AIProvider {
  switch (type) {
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'deepseek':
      return new DeepSeekProvider();
    case 'doubao':
      return new DoubaoProvider();
    default:
      throw new Error(`Unknown AI provider: ${type}`);
  }
}

export function getAvailableProviders(): AIProviderType[] {
  const providers: AIProviderType[] = [];
  
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic');
  if (process.env.DEEPSEEK_API_KEY) providers.push('deepseek');
  if (process.env.DOUBAO_API_KEY) providers.push('doubao');
  
  return providers;
}