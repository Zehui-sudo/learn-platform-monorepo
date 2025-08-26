import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ErrorHandler, ErrorCode, LearnLinkerError } from '../utils/errors';
import { Helpers } from '../utils/helpers';
import { AuthManager } from '../services/auth/manager';
import { SettingsManager } from '../config/settings';
import { ApiClient } from '../services/api/client';
import { AIService } from '../services/ai/aiService';
import { ExplanationPanel } from '../ui/webview/ExplanationPanel';
import { ChatRequest, ContextReference, LinksRequest, SaveSnippetRequest } from '../services/api/types';

export class CommandHandler {
  private static instance: CommandHandler;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private authManager: AuthManager;
  private settingsManager: SettingsManager;
  private apiClient: ApiClient | null = null;
  private aiService: AIService;
  private context?: vscode.ExtensionContext;

  private constructor() {
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.authManager = AuthManager.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    this.aiService = AIService.getInstance();
  }

  public static getInstance(): CommandHandler {
    if (!CommandHandler.instance) {
      CommandHandler.instance = new CommandHandler();
    }
    return CommandHandler.instance;
  }

  public setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing CommandHandler...');
      
      // Initialize AI Service first (independent functionality)
      await this.initializeAIService();
      
      // Initialize platform connection if enabled (optional enhancement)
      const platformEnabled = vscode.workspace.getConfiguration('learnLinker').get<boolean>('platform.enabled', false);
      if (platformEnabled) {
        await this.initializePlatformConnection();
      } else {
        this.logger.info('Platform connection disabled, running in standalone mode');
      }

      this.logger.info('CommandHandler initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CommandHandler:', error);
      // Don't throw - allow partial initialization
      vscode.window.showWarningMessage('Learn Linker: Some features may be limited. Check the output panel for details.');
    }
  }
  
  private async initializeAIService(): Promise<void> {
    try {
      // Load AI configuration from settings
      const config = AIService.loadConfigFromSettings();
      
      if (!config) {
        this.logger.warn('AI configuration not found in settings');
        vscode.window.showInformationMessage(
          'Learn Linker: Please configure AI settings to enable code explanation.',
          'Configure Now'
        ).then(async (choice) => {
          if (choice === 'Configure Now') {
            const newConfig = await AIService.promptForConfiguration();
            if (newConfig) {
              await this.aiService.initialize(newConfig);
            }
          }
        });
        return;
      }
      
      // Initialize AI service
      const success = await this.aiService.initialize(config);
      if (success) {
        this.logger.info('AI Service initialized successfully');
      } else {
        this.logger.warn('AI Service initialization failed');
      }
    } catch (error) {
      this.logger.error('Error initializing AI Service:', error);
    }
  }
  
  private async initializePlatformConnection(): Promise<void> {
    try {
      // Initialize auth manager
      await this.authManager.initialize();
      
      // Initialize API client
      const authConfig = await this.authManager.getConfig();
      const authHeader = await this.authManager.getAuthorizationHeader();
      
      if (authConfig.platformUrl && authHeader) {
        this.apiClient = ApiClient.getInstance({
          baseUrl: authConfig.platformUrl,
          authToken: authHeader,
          timeout: 30000,
          retries: 3
        });
        this.logger.info('Platform connection initialized');
      }
    } catch (error) {
      this.logger.error('Failed to initialize platform connection:', error);
      // Don't throw - platform connection is optional
    }
  }

  public async explainSelection(): Promise<void> {
    try {
      this.logger.info('Executing explainSelection command');
      
      // Get selected text
      const selectedText = Helpers.getSelectedText();
      if (!selectedText) {
        vscode.window.showInformationMessage('Please select some code to explain.');
        return;
      }

      // Get file info
      const fileInfo = Helpers.getCurrentFileInfo();
      if (!fileInfo) {
        vscode.window.showInformationMessage('No active editor found.');
        return;
      }

      // Check if AI service is ready
      const aiStatus = this.aiService.getStatus();
      if (!aiStatus.isReady) {
        const action = await vscode.window.showErrorMessage(
          'AI Service is not configured. Please configure your AI settings.',
          'Configure Now'
        );
        
        if (action === 'Configure Now') {
          const config = await AIService.promptForConfiguration();
          if (config) {
            const success = await this.aiService.initialize(config);
            if (!success) {
              return;
            }
          } else {
            return;
          }
        } else {
          return;
        }
      }

      // Check if context is set
      if (!this.context) {
        vscode.window.showErrorMessage('Extension context not available. Please restart the extension.');
        return;
      }

      // Show progress
      await Helpers.withProgress(
        'Explaining code...',
        async (progress) => {
          progress.report({ message: 'Analyzing code...' });
          
          try {
            // Get code explanation from AI service
            const stream = await this.aiService.explainCode(
              selectedText,
              {
                language: fileInfo.language,
                fileName: fileInfo.fileName,
                filePath: fileInfo.filePath,
                lineRange: fileInfo.lineRange || undefined
              },
              {
                style: 'detailed'
              }
            );
            
            progress.report({ message: 'Opening explanation panel...' });
            
            // Show webview panel with code info (context is guaranteed to be defined here)
            const panel = await ExplanationPanel.show(this.context!, {
              code: selectedText,
              language: fileInfo.language,
              fileName: fileInfo.fileName,
              lineRange: fileInfo.lineRange || undefined
            });
            
            progress.report({ message: 'Receiving explanation...' });
            
            // Stream content to the panel
            await panel.streamContent(stream);
            
            // Show success message
            vscode.window.showInformationMessage(
              `Code explained successfully!`
            );
            
            // If platform is connected, try to get knowledge links
            if (this.apiClient) {
              try {
                progress.report({ message: 'Fetching related knowledge links...' });
                // This will be implemented when platform API is ready
                this.logger.debug('Platform connected, could fetch knowledge links here');
              } catch (error) {
                // Ignore - platform features are optional
                this.logger.debug('Failed to fetch knowledge links:', error);
              }
            }
            
          } catch (error) {
            this.logger.error('Failed to explain code:', error);
            vscode.window.showErrorMessage(
              `Failed to explain code: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      );
    } catch (error) {
      this.logger.error('Error in explainSelection:', error);
      await this.errorHandler.handleError(error, 'explainSelection');
    }
  }

  public async saveToReview(): Promise<void> {
    try {
      this.logger.info('Executing saveToReview command');
      
      // Get selected text
      const selectedText = Helpers.getSelectedText();
      if (!selectedText) {
        vscode.window.showInformationMessage('Please select some code to save for review.');
        return;
      }

      // Get file info
      const fileInfo = Helpers.getCurrentFileInfo();
      if (!fileInfo) {
        vscode.window.showInformationMessage('No active editor found.');
        return;
      }

      // Validate auth config
      const isValidAuth = await this.authManager.validateConfig();
      if (!isValidAuth) {
        const action = await vscode.window.showErrorMessage(
          'Authentication configuration is invalid. Please configure your settings.',
          'Open Settings'
        );
        
        if (action === 'Open Settings') {
          await this.authManager.showAuthSetupUI();
        }
        return;
      }

      // Ask for note
      const note = await vscode.window.showInputBox({
        prompt: 'Add a note for this code snippet (optional)',
        placeHolder: 'Why are you saving this code?'
      });

      // Show progress
      await Helpers.withProgress(
        'Saving code for review...',
        async (progress) => {
          progress.report({ message: 'Preparing snippet...' });
          
          // Extract code features
          const features = Helpers.extractCodeFeatures(selectedText, fileInfo.language);
          
          progress.report({ message: 'Saving to review collection...' });
          
          // Prepare save request
          const saveRequest: SaveSnippetRequest = {
            code: selectedText,
            language: fileInfo.language as 'javascript' | 'python' | 'typescript',
            filePath: Helpers.getRelativePath(fileInfo.filePath),
            repo: fileInfo.fileName,
            tags: features,
            note: note || undefined
          };

          // Get API client
          if (!this.apiClient) {
            await this.initialize();
          }

          // Save snippet
          if (!this.apiClient) {
            throw new LearnLinkerError('API client not available', ErrorCode.API_ERROR);
          }
          const response = await this.apiClient.saveSnippet(saveRequest);
          
          this.logger.info('Snippet saved successfully', {
            snippetId: response.id,
            codeLength: selectedText.length,
            language: fileInfo.language
          });

          vscode.window.showInformationMessage(
            `Code snippet saved successfully! ID: ${response.id}`
          );
        }
      );
    } catch (error) {
      this.logger.error('Error in saveToReview:', error);
      await this.errorHandler.handleError(error, 'saveToReview');
    }
  }

  public async openInLearningPlatform(): Promise<void> {
    try {
      this.logger.info('Executing openInLearningPlatform command');
      
      // Get settings
      const settings = this.settingsManager.getSettings();
      const platformUrl = settings.platformUrl;
      
      if (!platformUrl) {
        vscode.window.showErrorMessage('Please configure the learning platform URL in settings.');
        return;
      }

      // Get selected text (if any) for deep link
      const selectedText = Helpers.getSelectedText();
      const fileInfo = Helpers.getCurrentFileInfo();
      
      let deepLinkUrl = platformUrl;
      
      if (selectedText && fileInfo) {
        // Create deep link with selected code
        const encodedCode = encodeURIComponent(selectedText);
        deepLinkUrl = `${platformUrl}/learn?language=${fileInfo.language}&highlight=${encodedCode}`;
      }

      // Open URL
      await Helpers.openUrl(deepLinkUrl);
      
      this.logger.info('Opened learning platform', { url: deepLinkUrl });
    } catch (error) {
      this.logger.error('Error in openInLearningPlatform:', error);
      await this.errorHandler.handleError(error, 'openInLearningPlatform');
    }
  }

  public async showSettings(): Promise<void> {
    try {
      this.logger.info('Executing showSettings command');
      await this.settingsManager.showSettingsUI();
    } catch (error) {
      this.logger.error('Error in showSettings:', error);
      await this.errorHandler.handleError(error, 'showSettings');
    }
  }

  public async testConnection(): Promise<void> {
    try {
      this.logger.info('Executing testConnection command');
      
      // Show progress
      const isConnected = await Helpers.withProgress(
        'Testing connection to learning platform...',
        async (progress) => {
          progress.report({ message: 'Validating authentication...' });
          
          const isValidAuth = await this.authManager.validateConfig();
          if (!isValidAuth) {
            throw new LearnLinkerError(
              'Authentication configuration is invalid',
              ErrorCode.AUTH_ERROR
            );
          }
          
          progress.report({ message: 'Testing API connection...' });
          
          // Get API client
          if (!this.apiClient) {
            await this.initialize();
          }
          
          // Test connection
          if (!this.apiClient) {
            throw new LearnLinkerError('API client not available', ErrorCode.API_ERROR);
          }
          return await this.apiClient.testConnection();
        }
      );
      
      if (isConnected) {
        vscode.window.showInformationMessage('Connection to learning platform successful!');
      } else {
        vscode.window.showErrorMessage('Failed to connect to learning platform. Please check your settings.');
      }
    } catch (error) {
      this.logger.error('Error in testConnection:', error);
      await this.errorHandler.handleError(error, 'testConnection');
    }
  }
}