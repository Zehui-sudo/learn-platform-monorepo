import * as vscode from 'vscode';
import { SettingsManager, LearnLinkerSettings } from '../../config/settings';
import { SecretManager } from '../../config/secrets';
import { WorkspaceConfigManager, WorkspaceConfig } from '../../config/workspace';
import { Logger } from '../../utils/logger';

export interface EnhancedWorkspaceConfig extends WorkspaceConfig {
  // Usage history
  lastUsedProvider?: string;
  lastUsedAt?: string;
  usageCount?: number;
  preferredModel?: string;
  
  // Project preferences
  customPrompts?: Record<string, string>;
  
  // Performance optimization
  cacheEnabled?: boolean;
  cachedExplanations?: Map<string, string>;
  
  // Learning tracking
  reviewedSnippets?: string[];
  learningProgress?: Record<string, number>;
}

export interface CompleteConfig {
  // Settings
  platformUrl: string;
  personalAccessToken?: string;
  sendStrategy: 'summary' | 'fullCode';
  provider: 'openai' | 'anthropic' | 'deepseek' | 'doubao';
  
  // AI Configuration
  apiKey?: string;
  model?: string;
  apiBase?: string;
  temperature?: number;
  maxTokens?: number;
  
  // Workspace specific
  workspaceConfig?: EnhancedWorkspaceConfig;
  
  // Feature flags
  features: {
    ai: { enabled: boolean; status: 'ready' | 'pending' | 'error' };
    platform: { enabled: boolean; status: 'ready' | 'pending' | 'error' };
    storage: { enabled: boolean; status: 'ready' | 'pending' | 'error' };
  };
}

export interface FileContext {
  filePath: string;
  language: string;
  fileName: string;
  lineRange?: { start: number; end: number } | string;
}

export class ConfigurationService {
  private static instance: ConfigurationService;
  private settings: SettingsManager;
  private secrets: SecretManager;
  private workspace: WorkspaceConfigManager;
  private logger: Logger;
  private configChangeHandlers: ((config: CompleteConfig) => void)[] = [];
  private featureStatus: CompleteConfig['features'] = {
    ai: { enabled: false, status: 'pending' },
    platform: { enabled: false, status: 'pending' },
    storage: { enabled: false, status: 'pending' }
  };

  private constructor() {
    this.settings = SettingsManager.getInstance();
    this.secrets = SecretManager.getInstance();
    this.workspace = WorkspaceConfigManager.getInstance();
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  public initialize(context: vscode.ExtensionContext): void {
    this.settings.initialize(context);
    this.secrets.initialize(context);
    this.workspace.initialize(context);
    
    // Watch for configuration changes
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('learnLinker')) {
        const config = await this.getConfiguration();
        this.notifyConfigurationChange(config);
      }
    });
  }

  /**
   * Get complete merged configuration
   */
  public async getConfiguration(context?: FileContext): Promise<CompleteConfig> {
    const globalSettings = this.settings.getSettings();
    
    // Get workspace overrides if context is provided
    let workspaceConfig: EnhancedWorkspaceConfig | null = null;
    if (context) {
      workspaceConfig = this.workspace.getWorkspaceConfig(context.filePath) as EnhancedWorkspaceConfig;
    }
    
    // Get AI configuration from VS Code settings
    const aiConfig = vscode.workspace.getConfiguration('learnLinker.ai');
    const configuredProvider = aiConfig.get<string>('provider') || globalSettings.provider;
    
    // Try to get API key from multiple sources
    // 1. First try from VS Code settings directly
    let apiKey = aiConfig.get<string>('apiKey');
    
    // 2. If not found, try from secrets storage
    if (!apiKey) {
      apiKey = await this.secrets.getApiKey(configuredProvider);
    }
    
    // Get personal access token if available
    const personalAccessToken = await this.secrets.getPersonalAccessToken();
    
    // Merge configurations with priority: workspace > global > default
    return {
      platformUrl: globalSettings.platformUrl,
      personalAccessToken,
      sendStrategy: globalSettings.sendStrategy,
      provider: configuredProvider as any,
      
      // AI settings
      apiKey,
      model: workspaceConfig?.preferredModel || aiConfig.get<string>('model'),
      apiBase: aiConfig.get<string>('apiBase'),
      temperature: aiConfig.get<number>('temperature', 0.7),
      maxTokens: aiConfig.get<number>('maxTokens', 2000),
      
      // Workspace specific
      workspaceConfig: workspaceConfig || undefined,
      
      // Feature status
      features: this.featureStatus
    };
  }

  /**
   * Update workspace configuration with usage tracking
   */
  public async updateWorkspaceUsage(context: FileContext, updates: Partial<EnhancedWorkspaceConfig>): Promise<void> {
    try {
      const existing = this.workspace.getWorkspaceConfig(context.filePath) as EnhancedWorkspaceConfig || {
        language: context.language,
        filePath: context.filePath,
        repoName: undefined
      };
      
      const updatedConfig: EnhancedWorkspaceConfig = {
        ...existing,
        ...updates,
        lastUsedAt: new Date().toISOString(),
        usageCount: (existing.usageCount || 0) + 1
      };
      
      await this.workspace.saveWorkspaceConfig(updatedConfig);
      this.logger.debug('Updated workspace usage', { filePath: context.filePath, updates });
    } catch (error) {
      this.logger.error('Failed to update workspace usage', error);
    }
  }

  /**
   * Get or prompt for API credentials
   */
  public async getCredentials(provider?: string): Promise<{ provider: string; apiKey: string } | null> {
    const targetProvider = provider || this.settings.getSettings().provider;
    
    // Try to get from secrets
    let apiKey = await this.secrets.getApiKey(targetProvider);
    
    if (!apiKey) {
      // Prompt for API key
      apiKey = await vscode.window.showInputBox({
        prompt: `Enter your ${targetProvider.toUpperCase()} API key`,
        password: true,
        placeHolder: 'sk-...'
      });
      
      if (apiKey) {
        await this.secrets.storeApiKey(targetProvider, apiKey);
      } else {
        return null;
      }
    }
    
    return { provider: targetProvider, apiKey };
  }

  /**
   * Update feature status
   */
  public updateFeatureStatus(feature: keyof CompleteConfig['features'], status: Partial<CompleteConfig['features'][typeof feature]>): void {
    this.featureStatus[feature] = { ...this.featureStatus[feature], ...status };
    this.logger.debug(`Feature status updated: ${feature}`, status);
  }

  /**
   * Get feature status
   */
  public getFeatureStatus(): CompleteConfig['features'] {
    return this.featureStatus;
  }

  /**
   * Smart initialization with feature detection
   */
  public async initializeFeatures(): Promise<void> {
    const initTasks = [
      this.initAIFeature(),
      this.initPlatformFeature(),
      this.initStorageFeature()
    ];
    
    const results = await Promise.allSettled(initTasks);
    
    // Log initialization results
    results.forEach((result, index) => {
      const feature = ['AI', 'Platform', 'Storage'][index];
      if (result.status === 'rejected') {
        this.logger.warn(`${feature} initialization failed:`, result.reason);
      }
    });
    
    // Show feature status to user
    this.showFeatureStatus();
  }

  private async initAIFeature(): Promise<void> {
    try {
      const config = await this.getConfiguration();
      this.logger.debug('AI configuration loaded:', {
        provider: config.provider,
        hasApiKey: !!config.apiKey,
        apiKeyLength: config.apiKey?.length,
        model: config.model
      });
      
      if (config.apiKey) {
        this.updateFeatureStatus('ai', { enabled: true, status: 'ready' });
      } else {
        this.logger.warn('API key not found in configuration');
        this.updateFeatureStatus('ai', { enabled: false, status: 'pending' });
      }
    } catch (error) {
      this.logger.error('Failed to initialize AI feature:', error);
      this.updateFeatureStatus('ai', { enabled: false, status: 'error' });
      throw error;
    }
  }

  private async initPlatformFeature(): Promise<void> {
    try {
      const config = await this.getConfiguration();
      const platformEnabled = vscode.workspace.getConfiguration('learnLinker').get<boolean>('platform.enabled', false);
      
      if (platformEnabled && config.platformUrl && config.personalAccessToken) {
        this.updateFeatureStatus('platform', { enabled: true, status: 'ready' });
      } else {
        this.updateFeatureStatus('platform', { enabled: false, status: 'pending' });
      }
    } catch (error) {
      this.updateFeatureStatus('platform', { enabled: false, status: 'error' });
      throw error;
    }
  }

  private async initStorageFeature(): Promise<void> {
    try {
      const storageEnabled = vscode.workspace.getConfiguration('learnLinker.storage').get<boolean>('enabled', true);
      this.updateFeatureStatus('storage', { enabled: storageEnabled, status: 'ready' });
    } catch (error) {
      this.updateFeatureStatus('storage', { enabled: false, status: 'error' });
      throw error;
    }
  }

  private showFeatureStatus(): void {
    const status = this.getFeatureStatus();
    const enabledFeatures = Object.entries(status)
      .filter(([_, config]) => config.enabled && config.status === 'ready')
      .map(([name]) => name);
    
    if (enabledFeatures.length === 0) {
      vscode.window.showWarningMessage(
        'Learn Linker: No features are enabled. Please configure the extension.',
        'Configure'
      ).then(choice => {
        if (choice === 'Configure') {
          vscode.commands.executeCommand('learn-linker.showSettings');
        }
      });
    } else {
      vscode.window.showInformationMessage(
        `Learn Linker ready with: ${enabledFeatures.join(', ')}`
      );
    }
  }

  /**
   * Register configuration change handler
   */
  public onConfigurationChanged(handler: (config: CompleteConfig) => void): vscode.Disposable {
    this.configChangeHandlers.push(handler);
    return new vscode.Disposable(() => {
      const index = this.configChangeHandlers.indexOf(handler);
      if (index >= 0) {
        this.configChangeHandlers.splice(index, 1);
      }
    });
  }

  private async notifyConfigurationChange(config: CompleteConfig): Promise<void> {
    for (const handler of this.configChangeHandlers) {
      try {
        handler(config);
      } catch (error) {
        this.logger.error('Error in configuration change handler', error);
      }
    }
  }

  /**
   * Clear cached configurations
   */
  public async clearCache(filePath?: string): Promise<void> {
    if (filePath) {
      await this.workspace.clearWorkspaceConfig(filePath);
    } else {
      await this.workspace.clearAllWorkspaceConfigs();
    }
  }
}