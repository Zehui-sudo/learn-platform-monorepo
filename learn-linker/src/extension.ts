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
  try {
    // Initialize our modules
    SettingsManager.getInstance().initialize(context);
    SecretManager.getInstance().initialize(context);
    WorkspaceConfigManager.getInstance().initialize(context);
    Logger.getInstance().initialize(context);
    
    const logger = Logger.getInstance();
    const errorHandler = ErrorHandler.getInstance();
    const commandHandler = CommandHandler.getInstance();
    
    logger.info('Learn Linker extension is now active!');

    // Initialize command handler
    await commandHandler.initialize();

    // Register commands
    const explainSelectionCommand = vscode.commands.registerCommand(
      'learn-linker.explainSelection',
      errorHandler.wrapAsync(async () => {
        await commandHandler.explainSelection();
      }, 'explainSelection')
    );

    const saveToReviewCommand = vscode.commands.registerCommand(
      'learn-linker.saveToReview',
      errorHandler.wrapAsync(async () => {
        await commandHandler.saveToReview();
      }, 'saveToReview')
    );

    const openInLearningPlatformCommand = vscode.commands.registerCommand(
      'learn-linker.openInLearningPlatform',
      errorHandler.wrapAsync(async () => {
        await commandHandler.openInLearningPlatform();
      }, 'openInLearningPlatform')
    );

    const showSettingsCommand = vscode.commands.registerCommand(
      'learn-linker.showSettings',
      errorHandler.wrapAsync(async () => {
        await commandHandler.showSettings();
      }, 'showSettings')
    );

    // Register all commands
    context.subscriptions.push(
      explainSelectionCommand,
      saveToReviewCommand,
      openInLearningPlatformCommand,
      showSettingsCommand
    );

    // Show welcome message on first activation
    const isFirstActivation = !context.globalState.get('learnLinker.activated');
    if (isFirstActivation) {
      context.globalState.update('learnLinker.activated', true);
      vscode.window.showInformationMessage(
        'Learn Linker is now active! Configure your settings to get started.',
        'Open Settings'
      ).then(selection => {
        if (selection === 'Open Settings') {
          SettingsManager.getInstance().showSettingsUI();
        }
      });
    }

    logger.info('Learn Linker extension activation completed successfully');
  } catch (error) {
    const logger = Logger.getInstance();
    logger.error('Failed to activate Learn Linker extension:', error);
    vscode.window.showErrorMessage('Failed to activate Learn Linker extension. Please check the output panel for details.');
  }
}

// This method is called when your extension is deactivated
export function deactivate() {
  const logger = Logger.getInstance();
  logger.info('Learn Linker extension is being deactivated...');
  logger.dispose();
}
