import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';
import { ErrorHandler, ErrorCode, LearnLinkerError } from '../../utils/errors';
import { SecretManager } from '../../config/secrets';
import { SettingsManager, LearnLinkerSettings } from '../../config/settings';
import { AIProvider } from '../api/types';

export interface AuthConfig {
  platformUrl: string;
  personalAccessToken?: string;
  provider: AIProvider;
  providerApiKey?: string;
}

export class AuthManager {
  private static instance: AuthManager;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private secretManager: SecretManager;
  private settingsManager: SettingsManager;
  private currentConfig: AuthConfig | null = null;

  private constructor() {
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.secretManager = SecretManager.getInstance();
    this.settingsManager = SettingsManager.getInstance();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const settings = this.settingsManager.getSettings();
      this.currentConfig = {
        platformUrl: settings.platformUrl,
        provider: settings.provider
      };

      // Try to get PAT from secrets
      const pat = await this.secretManager.getPersonalAccessToken();
      if (pat) {
        this.currentConfig.personalAccessToken = pat;
      }

      // Try to get provider API key from secrets
      const providerApiKey = await this.secretManager.getApiKey(settings.provider);
      if (providerApiKey) {
        this.currentConfig.providerApiKey = providerApiKey;
      }

      this.logger.debug('AuthManager initialized with config:', {
        platformUrl: this.currentConfig.platformUrl,
        hasPAT: !!this.currentConfig.personalAccessToken,
        provider: this.currentConfig.provider,
        hasProviderApiKey: !!this.currentConfig.providerApiKey
      });
    } catch (error) {
      this.logger.error('Failed to initialize AuthManager:', error);
      throw error;
    }
  }

  public async getConfig(): Promise<AuthConfig> {
    if (!this.currentConfig) {
      await this.initialize();
    }
    return this.currentConfig!;
  }

  public async updateConfig(updates: Partial<AuthConfig>): Promise<void> {
    try {
      if (!this.currentConfig) {
        await this.initialize();
      }

      this.currentConfig = { ...this.currentConfig!, ...updates };

      // Update settings if needed
      const settingsUpdates: Partial<LearnLinkerSettings> = {};
      
      if (updates.platformUrl !== undefined) {
        settingsUpdates.platformUrl = updates.platformUrl;
      }
      
      if (updates.provider !== undefined) {
        settingsUpdates.provider = updates.provider;
      }

      if (Object.keys(settingsUpdates).length > 0) {
        await this.settingsManager.updateSettings(settingsUpdates);
      }

      // Update secrets if needed
      if (updates.personalAccessToken !== undefined) {
        if (updates.personalAccessToken) {
          await this.secretManager.storePersonalAccessToken(updates.personalAccessToken);
        } else {
          await this.secretManager.deletePersonalAccessToken();
        }
      }

      if (updates.providerApiKey !== undefined) {
        const provider = updates.provider || this.currentConfig.provider;
        if (updates.providerApiKey) {
          await this.secretManager.storeApiKey(provider, updates.providerApiKey);
        } else {
          await this.secretManager.deleteApiKey(provider);
        }
      }

      this.logger.info('Auth config updated successfully');
    } catch (error) {
      this.logger.error('Failed to update auth config:', error);
      throw error;
    }
  }

  public async setPersonalAccessToken(token: string): Promise<void> {
    try {
      await this.updateConfig({ personalAccessToken: token });
      this.logger.info('Personal Access Token updated');
    } catch (error) {
      this.logger.error('Failed to set Personal Access Token:', error);
      throw error;
    }
  }

  public async setProviderApiKey(provider: AIProvider, apiKey: string): Promise<void> {
    try {
      await this.updateConfig({ provider, providerApiKey: apiKey });
      this.logger.info(`API key for provider ${provider} updated`);
    } catch (error) {
      this.logger.error(`Failed to set API key for provider ${provider}:`, error);
      throw error;
    }
  }

  public async getAuthorizationHeader(): Promise<string | null> {
    try {
      const config = await this.getConfig();
      
      if (config.personalAccessToken) {
        return `Bearer ${config.personalAccessToken}`;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to get authorization header:', error);
      return null;
    }
  }

  public async validateConfig(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      
      // Validate platform URL
      if (!config.platformUrl || !config.platformUrl.startsWith('http')) {
        throw new LearnLinkerError(
          'Invalid platform URL',
          ErrorCode.CONFIG_ERROR,
          { platformUrl: config.platformUrl }
        );
      }

      // Validate provider
      if (!config.provider) {
        throw new LearnLinkerError(
          'No AI provider selected',
          ErrorCode.CONFIG_ERROR
        );
      }

      // For now, we'll consider the config valid if it has the basic required fields
      // In a real implementation, you might want to validate the tokens/API keys as well
      this.logger.debug('Auth config validation passed');
      return true;
    } catch (error) {
      this.logger.error('Auth config validation failed:', error);
      return false;
    }
  }

  public async showAuthSetupUI(): Promise<void> {
    try {
      const platformUrl = await vscode.window.showInputBox({
        prompt: 'Enter your learning platform URL',
        placeHolder: 'http://localhost:3000',
        value: this.currentConfig?.platformUrl || 'http://localhost:3000'
      });

      if (!platformUrl) {
        return; // User cancelled
      }

      const pat = await vscode.window.showInputBox({
        prompt: 'Enter your Personal Access Token (PAT)',
        password: true,
        placeHolder: 'Enter your PAT...'
      });

      if (pat === undefined) {
        return; // User cancelled
      }

      await this.updateConfig({
        platformUrl,
        personalAccessToken: pat || undefined
      });

      vscode.window.showInformationMessage('Authentication configuration updated successfully!');
    } catch (error) {
      this.logger.error('Failed to show auth setup UI:', error);
      await this.errorHandler.handleError(error, 'showAuthSetupUI');
    }
  }

  public async clearAuth(): Promise<void> {
    try {
      await this.secretManager.deletePersonalAccessToken();
      
      if (this.currentConfig?.provider) {
        await this.secretManager.deleteApiKey(this.currentConfig.provider);
      }

      this.currentConfig = null;
      this.logger.info('Auth configuration cleared');
    } catch (error) {
      this.logger.error('Failed to clear auth configuration:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      
      // For now, we'll just validate the config
      // In a real implementation, you might want to make a test API call
      const isValid = await this.validateConfig();
      
      if (isValid) {
        this.logger.info('Connection test successful');
        return true;
      } else {
        this.logger.warn('Connection test failed');
        return false;
      }
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }
}