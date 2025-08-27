// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

// Import optimized modules
import { ConfigurationService } from './services/config/configurationService';
import { CommandHandlerV2 } from './core/commandHandlerV2';
import { Logger } from './utils/logger';
import { ErrorHandler } from './utils/errors';

// Use original CommandHandler as fallback during migration
import { CommandHandler } from './core/commandHandler';

/**
 * Extension activation with optimized architecture
 */
export async function activate(context: vscode.ExtensionContext) {
  const logger = Logger.getInstance();
  
  try {
    console.log('Learn Linker: Starting activation with optimized architecture...');
    
    // Initialize logger first
    logger.initialize(context);
    logger.info('Learn Linker extension is activating...');
    logger.info(`Extension Path: ${context.extensionPath}`);
    logger.info(`Storage Path: ${context.storagePath || 'Not available'}`);
    
    // Check if we should use V2 (configurable for safe rollout)
    const useV2 = vscode.workspace.getConfiguration('learnLinker').get<boolean>('useV2Architecture', true);
    
    if (useV2) {
      // Use new optimized architecture
      logger.info('Using optimized V2 architecture');
      await activateV2(context);
    } else {
      // Use original architecture as fallback
      logger.info('Using original architecture');
      await activateOriginal(context);
    }
    
    logger.info('Learn Linker extension activation completed successfully');
    console.log('Learn Linker: Activation completed');
    
    // Return API for other extensions
    return {
      version: '0.0.1',
      isActive: true,
      architecture: useV2 ? 'v2' : 'v1'
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

/**
 * Activate with optimized V2 architecture
 */
async function activateV2(context: vscode.ExtensionContext) {
  const logger = Logger.getInstance();
  const errorHandler = ErrorHandler.getInstance();
  
  // Initialize unified configuration service
  const configService = ConfigurationService.getInstance();
  configService.initialize(context);
  
  // Initialize command handler V2
  const commandHandler = CommandHandlerV2.getInstance();
  commandHandler.setContext(context);
  
  // Smart initialization with feature detection
  try {
    await commandHandler.initialize();
  } catch (error) {
    logger.error('CommandHandler V2 initialization error (non-fatal):', error);
    // Continue with partial functionality
  }
  
  // Register commands with cleaner syntax
  const commands = [
    {
      id: 'learn-linker.explainSelection',
      handler: () => commandHandler.explainSelection({} as any)
    },
    {
      id: 'learn-linker.saveToReview',
      handler: () => commandHandler.saveToReview({} as any)
    },
    {
      id: 'learn-linker.openInLearningPlatform',
      handler: () => commandHandler.openInLearningPlatform()
    },
    {
      id: 'learn-linker.showSettings',
      handler: () => commandHandler.showSettings()
    },
    {
      id: 'learn-linker.testConnection',
      handler: () => commandHandler.testConnection()
    },
    {
      id: 'learn-linker.clearCache',
      handler: () => commandHandler.clearCache()
    },
    // New storage commands
    {
      id: 'learn-linker.showSnippetCollection',
      handler: () => commandHandler.showSnippetCollection()
    },
    {
      id: 'learn-linker.showReviewQueue',
      handler: () => commandHandler.showReviewQueue()
    },
    {
      id: 'learn-linker.exportSnippets',
      handler: () => commandHandler.exportSnippets()
    },
    {
      id: 'learn-linker.importSnippets',
      handler: () => commandHandler.importSnippets()
    },
    {
      id: 'learn-linker.showStatistics',
      handler: () => commandHandler.showStatistics()
    }
  ];
  
  // Register all commands
  for (const cmd of commands) {
    const disposable = vscode.commands.registerCommand(
      cmd.id,
      errorHandler.wrapAsync(async () => {
        logger.info(`Command triggered: ${cmd.id}`);
        await cmd.handler();
      }, cmd.id)
    );
    context.subscriptions.push(disposable);
  }
  
  logger.info(`Registered ${commands.length} commands with V2 architecture`);
  
  // Show first-time setup if needed
  await showFirstTimeSetup(context, configService);
  
  // Show feature status
  const features = configService.getFeatureStatus();
  const readyFeatures = Object.entries(features)
    .filter(([_, status]) => status.enabled && status.status === 'ready')
    .map(([name]) => name);
  
  if (readyFeatures.length > 0) {
    vscode.window.setStatusBarMessage(
      `Learn Linker V2: ${readyFeatures.join(', ')} ready`,
      5000
    );
  }
}

/**
 * Original activation (fallback)
 */
async function activateOriginal(context: vscode.ExtensionContext) {
  const logger = Logger.getInstance();
  
  // Import original modules
  const { SettingsManager } = await import('./config/settings');
  const { SecretManager } = await import('./config/secrets');
  const { WorkspaceConfigManager } = await import('./config/workspace');
  
  // Initialize original modules
  SettingsManager.getInstance().initialize(context);
  SecretManager.getInstance().initialize(context);
  WorkspaceConfigManager.getInstance().initialize(context);
  
  const errorHandler = ErrorHandler.getInstance();
  const commandHandler = CommandHandler.getInstance();
  
  commandHandler.setContext(context);
  
  // Initialize command handler
  try {
    await commandHandler.initialize();
  } catch (error) {
    logger.error('CommandHandler initialization error (non-fatal):', error);
  }
  
  // Register commands (original way)
  const commands = [
    'explainSelection',
    'saveToReview',
    'openInLearningPlatform',
    'showSettings',
    'testConnection'
  ];
  
  for (const cmd of commands) {
    const disposable = vscode.commands.registerCommand(
      `learn-linker.${cmd}`,
      errorHandler.wrapAsync(async () => {
        logger.info(`Command triggered: ${cmd}`);
        await (commandHandler as any)[cmd]();
      }, cmd)
    );
    context.subscriptions.push(disposable);
  }
  
  logger.info(`Registered ${commands.length} commands with original architecture`);
  
  // Show status
  vscode.window.setStatusBarMessage('Learn Linker: Ready', 3000);
}

/**
 * Show first-time setup if needed
 */
async function showFirstTimeSetup(
  context: vscode.ExtensionContext,
  configService: ConfigurationService
) {
  const isFirstActivation = !context.globalState.get('learnLinker.activated');
  
  if (isFirstActivation) {
    context.globalState.update('learnLinker.activated', true);
    
    const action = await vscode.window.showInformationMessage(
      'Welcome to Learn Linker! Configure your AI provider to enable code explanation.',
      'Configure AI',
      'Configure Platform',
      'Later'
    );
    
    if (action === 'Configure AI') {
      const credentials = await configService.getCredentials();
      if (credentials) {
        vscode.window.showInformationMessage('AI provider configured successfully!');
      }
    } else if (action === 'Configure Platform') {
      await vscode.commands.executeCommand('learn-linker.showSettings');
    }
  }
}

/**
 * Extension deactivation
 */
export function deactivate() {
  const logger = Logger.getInstance();
  logger.info('Learn Linker extension is being deactivated...');
  
  // Clean up resources
  logger.dispose();
  
  console.log('Learn Linker: Deactivation completed');
}