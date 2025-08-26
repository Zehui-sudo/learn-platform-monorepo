import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ErrorHandler, ErrorCode, LearnLinkerError } from '../utils/errors';
import { Helpers } from '../utils/helpers';
import { AuthManager } from '../services/auth/manager';
import { SettingsManager } from '../config/settings';
import { ApiClient } from '../services/api/client';
import { ChatRequest, ContextReference, LinksRequest, SaveSnippetRequest } from '../services/api/types';

export class CommandHandler {
  private static instance: CommandHandler;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private authManager: AuthManager;
  private settingsManager: SettingsManager;
  private apiClient: ApiClient | null = null;

  private constructor() {
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.authManager = AuthManager.getInstance();
    this.settingsManager = SettingsManager.getInstance();
  }

  public static getInstance(): CommandHandler {
    if (!CommandHandler.instance) {
      CommandHandler.instance = new CommandHandler();
    }
    return CommandHandler.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize auth manager
      await this.authManager.initialize();
      
      // Initialize API client
      const authConfig = await this.authManager.getConfig();
      const authHeader = await this.authManager.getAuthorizationHeader();
      
      this.apiClient = ApiClient.getInstance({
        baseUrl: authConfig.platformUrl,
        authToken: authHeader || undefined,
        timeout: 30000,
        retries: 3
      });

      this.logger.info('CommandHandler initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CommandHandler:', error);
      throw error;
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

      // Show progress
      await Helpers.withProgress(
        'Analyzing code...',
        async (progress) => {
          progress.report({ message: 'Preparing code analysis...' });
          
          // Extract code features
          const features = Helpers.extractCodeFeatures(selectedText, fileInfo.language);
          
          progress.report({ message: 'Sending explanation request...' });
          
          // Prepare chat request
          const contextReference: ContextReference = {
            text: selectedText,
            source: `IDE:${fileInfo.fileName}:${fileInfo.lineRange?.start || 1}-${fileInfo.lineRange?.end || 1}`,
            type: 'code'
          };

          const chatRequest: ChatRequest = {
            messages: [
              {
                id: Helpers.generateId(),
                sender: 'user',
                content: `Please explain this ${fileInfo.language} code: ${selectedText}`,
                timestamp: Date.now()
              }
            ],
            provider: this.settingsManager.getSettings().provider,
            language: fileInfo.language,
            contextReference
          };

          // Get API client
          if (!this.apiClient) {
            await this.initialize();
          }

          // Send chat request (this will be implemented with SSE in the UI module)
          this.logger.info('Chat request prepared', {
            codeLength: selectedText.length,
            language: fileInfo.language,
            features
          });

          // For now, just show a message
          vscode.window.showInformationMessage(
            `Code analysis prepared for ${fileInfo.language} code (${selectedText.length} characters). Features detected: ${features.join(', ')}`
          );
          
          // TODO: Implement actual SSE streaming and UI display
          // This will be handled by the UI module
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