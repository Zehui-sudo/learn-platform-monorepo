/**
 * AI Service - Main entry point for AI functionality
 * 
 * This service manages AI providers and provides a unified interface
 * for code explanation functionality. It supports multiple providers
 * and handles provider selection, initialization, and error handling.
 */

import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/errors';
import {
  AIProvider,
  AIConfig,
  CodeContext,
  ExplainOptions,
  AIProviderError,
  AIProviderErrorCode,
  AIProviderType
} from './types';
import { OpenAIProvider } from './providers/openai';
import { DeepSeekProvider } from './providers/deepseek';

/**
 * AI Service Configuration
 */
export interface AIServiceConfig {
  provider: AIProviderType;
  apiKey: string;
  apiBase?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * AI Service Status
 */
export interface AIServiceStatus {
  isReady: boolean;
  provider?: AIProviderType;
  model?: string;
  lastError?: string;
  connectionValid?: boolean;
}

/**
 * Main AI Service class
 * Manages AI providers and provides code explanation functionality
 */
export class AIService {
  private static instance: AIService | null = null;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private provider: AIProvider | null = null;
  private config: AIServiceConfig | null = null;
  private status: AIServiceStatus = {
    isReady: false
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Initialize the AI service with configuration
   */
  public async initialize(config: AIServiceConfig): Promise<boolean> {
    try {
      this.logger.info('Initializing AI Service', {
        provider: config.provider,
        model: config.model
      });

      // Validate configuration
      if (!config.apiKey) {
        throw new AIProviderError(
          'API key is required',
          AIProviderErrorCode.INVALID_API_KEY,
          config.provider
        );
      }

      this.config = config;
      
      // Create provider based on type
      this.provider = this.createProvider(config);
      
      // Test connection
      const isConnected = await this.provider.testConnection();
      
      if (isConnected) {
        const info = this.provider.getProviderInfo();
        this.status = {
          isReady: true,
          provider: config.provider,
          model: info.model,
          connectionValid: true
        };
        
        this.logger.info('AI Service initialized successfully', this.status);
        
        // Show success notification
        vscode.window.showInformationMessage(
          `AI Service ready with ${info.name} (${info.model})`
        );
        
        return true;
      } else {
        this.status = {
          isReady: false,
          provider: config.provider,
          lastError: 'Connection test failed',
          connectionValid: false
        };
        
        this.logger.error('AI Service connection test failed');
        
        // Show error notification
        vscode.window.showErrorMessage(
          `Failed to connect to ${config.provider}. Please check your API key.`
        );
        
        return false;
      }
    } catch (error) {
      this.logger.error('Failed to initialize AI Service:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.status = {
        isReady: false,
        lastError: errorMessage,
        connectionValid: false
      };
      
      // Show error notification
      vscode.window.showErrorMessage(
        `AI Service initialization failed: ${errorMessage}`
      );
      
      return false;
    }
  }

  /**
   * Explain code using the configured AI provider
   */
  public async explainCode(
    code: string,
    context?: CodeContext,
    options?: ExplainOptions
  ): Promise<ReadableStream<string>> {
    if (!this.provider) {
      throw new AIProviderError(
        'AI Service not initialized. Please configure your API settings.',
        AIProviderErrorCode.INVALID_REQUEST
      );
    }

    if (!this.status.isReady) {
      throw new AIProviderError(
        'AI Service is not ready. Please check your configuration.',
        AIProviderErrorCode.INVALID_REQUEST
      );
    }

    try {
      this.logger.debug('Explaining code', {
        codeLength: code.length,
        language: context?.language,
        provider: this.config?.provider
      });

      const stream = await this.provider.explainCode(code, context, options);
      
      this.logger.debug('Code explanation started successfully');
      
      return stream;
    } catch (error) {
      this.logger.error('Failed to explain code:', error);
      
      // Update status on error
      if (error instanceof AIProviderError) {
        this.status.lastError = error.message;
        
        // If it's an auth error, mark as not ready
        if (error.code === AIProviderErrorCode.INVALID_API_KEY) {
          this.status.isReady = false;
          this.status.connectionValid = false;
        }
      }
      
      throw error;
    }
  }

  /**
   * Update configuration
   */
  public async updateConfig(config: AIServiceConfig): Promise<boolean> {
    this.logger.info('Updating AI Service configuration');
    
    // If provider changes, reinitialize
    if (this.config?.provider !== config.provider || 
        this.config?.apiKey !== config.apiKey ||
        this.config?.apiBase !== config.apiBase) {
      return await this.initialize(config);
    }
    
    // Otherwise just update config
    this.config = config;
    return true;
  }

  /**
   * Test current connection
   */
  public async testConnection(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    try {
      const isConnected = await this.provider.testConnection();
      this.status.connectionValid = isConnected;
      return isConnected;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      this.status.connectionValid = false;
      return false;
    }
  }

  /**
   * Get current status
   */
  public getStatus(): AIServiceStatus {
    return { ...this.status };
  }

  /**
   * Get provider information
   */
  public getProviderInfo() {
    if (!this.provider) {
      return null;
    }
    return this.provider.getProviderInfo();
  }

  /**
   * Get current provider name
   */
  public getCurrentProvider(): string | undefined {
    return this.config?.provider;
  }

  /**
   * Reset the service
   */
  public reset(): void {
    this.logger.info('Resetting AI Service');
    this.provider = null;
    this.config = null;
    this.status = {
      isReady: false
    };
  }

  /**
   * Create provider based on configuration
   */
  private createProvider(config: AIServiceConfig): AIProvider {
    const aiConfig: AIConfig = {
      provider: config.provider,
      apiKey: config.apiKey,
      apiBase: config.apiBase,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    };

    switch (config.provider) {
      case 'openai':
        this.logger.info('Creating OpenAI provider');
        return new OpenAIProvider({
          ...aiConfig,
          provider: 'openai'
        });
      
      case 'deepseek':
        this.logger.info('Creating DeepSeek provider');
        return new DeepSeekProvider({
          ...aiConfig,
          provider: 'deepseek'
        });
      
      case 'anthropic':
        // TODO: Implement Anthropic provider
        throw new AIProviderError(
          'Anthropic provider not yet implemented',
          AIProviderErrorCode.INVALID_REQUEST,
          'anthropic'
        );
      
      case 'doubao':
        // TODO: Implement Doubao provider
        throw new AIProviderError(
          'Doubao provider not yet implemented',
          AIProviderErrorCode.INVALID_REQUEST,
          'doubao'
        );
      
      default:
        throw new AIProviderError(
          `Unknown provider: ${config.provider}`,
          AIProviderErrorCode.INVALID_REQUEST
        );
    }
  }

  /**
   * Load configuration from VS Code settings
   */
  public static loadConfigFromSettings(): AIServiceConfig | null {
    const config = vscode.workspace.getConfiguration('learnLinker');
    
    const provider = config.get<AIProviderType>('ai.provider');
    const apiKey = config.get<string>('ai.apiKey');
    
    if (!provider || !apiKey) {
      return null;
    }

    return {
      provider,
      apiKey,
      apiBase: config.get<string>('ai.apiBase'),
      model: config.get<string>('ai.model'),
      temperature: config.get<number>('ai.temperature'),
      maxTokens: config.get<number>('ai.maxTokens')
    };
  }

  /**
   * Prompt user to configure AI settings
   */
  public static async promptForConfiguration(): Promise<AIServiceConfig | null> {
    const provider = await vscode.window.showQuickPick(
      [
        { label: 'OpenAI', value: 'openai', description: 'GPT-4, GPT-3.5' },
        { label: 'DeepSeek', value: 'deepseek', description: 'Cost-effective code model' },
        { label: 'Anthropic', value: 'anthropic', description: 'Claude (coming soon)', disabled: true },
        { label: 'Doubao', value: 'doubao', description: '豆包 (coming soon)', disabled: true }
      ].filter(item => !item.disabled),
      {
        placeHolder: 'Select AI provider',
        title: 'Configure AI Provider'
      }
    );

    if (!provider) {
      return null;
    }

    const apiKey = await vscode.window.showInputBox({
      prompt: `Enter your ${provider.label} API key`,
      placeHolder: 'sk-...',
      password: true,
      ignoreFocusOut: true
    });

    if (!apiKey) {
      return null;
    }

    // Save to settings
    const config = vscode.workspace.getConfiguration('learnLinker');
    await config.update('ai.provider', provider.value, vscode.ConfigurationTarget.Global);
    await config.update('ai.apiKey', apiKey, vscode.ConfigurationTarget.Global);

    return {
      provider: provider.value as AIProviderType,
      apiKey
    };
  }
}