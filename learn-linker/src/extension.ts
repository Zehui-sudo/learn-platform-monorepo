// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import our modules
import { SettingsManager } from './config/settings';
import { SecretManager } from './config/secrets';
import { WorkspaceConfigManager } from './config/workspace';
import { Logger } from './utils/logger';
import { ErrorHandler } from './utils/errors';
import { Helpers } from './utils/helpers';
import { CommandHandler } from './core/commandHandler';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  const logger = Logger.getInstance();
  
  try {
    console.log('Learn Linker: Starting activation...');
    
    // Initialize core modules
    SettingsManager.getInstance().initialize(context);
    SecretManager.getInstance().initialize(context);
    WorkspaceConfigManager.getInstance().initialize(context);
    Logger.getInstance().initialize(context);
    
    const errorHandler = ErrorHandler.getInstance();
    const commandHandler = CommandHandler.getInstance();
    
    // Pass context to command handler for webview panel
    commandHandler.setContext(context);
    
    logger.info('Learn Linker extension is activating...');
    logger.info(`Extension Path: ${context.extensionPath}`);
    logger.info(`Storage Path: ${context.storagePath || 'Not available'}`);

    // Initialize command handler (AI service and optional platform)
    try {
      await commandHandler.initialize();
    } catch (error) {
      logger.error('CommandHandler initialization error (non-fatal):', error);
      // Continue activation even if initialization partially fails
    }

    // Register commands
    logger.info('Registering commands...');
    
    const explainSelectionCommand = vscode.commands.registerCommand(
      'learn-linker.explainSelection',
      errorHandler.wrapAsync(async () => {
        logger.info('Command triggered: explainSelection');
        await commandHandler.explainSelection();
      }, 'explainSelection')
    );

    const saveToReviewCommand = vscode.commands.registerCommand(
      'learn-linker.saveToReview',
      errorHandler.wrapAsync(async () => {
        logger.info('Command triggered: saveToReview');
        await commandHandler.saveToReview();
      }, 'saveToReview')
    );

    const openInLearningPlatformCommand = vscode.commands.registerCommand(
      'learn-linker.openInLearningPlatform',
      errorHandler.wrapAsync(async () => {
        logger.info('Command triggered: openInLearningPlatform');
        await commandHandler.openInLearningPlatform();
      }, 'openInLearningPlatform')
    );

    const showSettingsCommand = vscode.commands.registerCommand(
      'learn-linker.showSettings',
      errorHandler.wrapAsync(async () => {
        logger.info('Command triggered: showSettings');
        await commandHandler.showSettings();
      }, 'showSettings')
    );
    
    // Test command for debugging
    const testConnectionCommand = vscode.commands.registerCommand(
      'learn-linker.testConnection',
      errorHandler.wrapAsync(async () => {
        logger.info('Command triggered: testConnection');
        await commandHandler.testConnection();
      }, 'testConnection')
    );

    // Register all commands
    context.subscriptions.push(
      explainSelectionCommand,
      saveToReviewCommand,
      openInLearningPlatformCommand,
      showSettingsCommand,
      testConnectionCommand
    );
    
    logger.info(`Registered ${context.subscriptions.length} commands`);

    // Show welcome message on first activation
    const isFirstActivation = !context.globalState.get('learnLinker.activated');
    if (isFirstActivation) {
      context.globalState.update('learnLinker.activated', true);
      vscode.window.showInformationMessage(
        'Learn Linker is now active! Configure your AI settings to get started.',
        'Configure AI'
      ).then(async selection => {
        if (selection === 'Configure AI') {
          // Use the AI service configuration prompt
          const { AIService } = await import('./services/ai/aiService');
          const config = await AIService.promptForConfiguration();
          if (config) {
            await AIService.getInstance().initialize(config);
          }
        }
      });
    } else {
      // Show status message
      vscode.window.setStatusBarMessage('Learn Linker: Ready', 3000);
    }

    logger.info('Learn Linker extension activation completed successfully');
    console.log('Learn Linker: Activation completed');
    
    // Return API for other extensions (if needed)
    return {
      version: '0.0.1',
      isActive: true
    };
    
  } catch (error) {
    console.error('Learn Linker: Activation failed', error);
    logger.error('Failed to activate Learn Linker extension:', error);
    vscode.window.showErrorMessage(
      `Failed to activate Learn Linker: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}

// This method is called when your extension is deactivated
export function deactivate() {
  const logger = Logger.getInstance();
  logger.info('Learn Linker extension is being deactivated...');
  logger.dispose();
}
