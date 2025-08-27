import * as vscode from 'vscode';
import { Helpers } from '../utils/helpers';
import { Logger } from '../utils/logger';

/**
 * Command execution context
 */
export interface CommandContext {
  selection?: string;
  fileInfo?: {
    fileName: string;
    filePath: string;
    language: string;
    lineRange?: { start: number; end: number } | string;
  };
  progress?: vscode.Progress<{ message?: string; increment?: number }>;
}

/**
 * Decorator to require text selection
 */
export function requireSelection(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(this: any, ...args: any[]) {
    const selection = Helpers.getSelectedText();
    if (!selection) {
      vscode.window.showInformationMessage('Please select some code first.');
      return;
    }
    
    const fileInfo = Helpers.getCurrentFileInfo();
    if (!fileInfo) {
      vscode.window.showInformationMessage('No active editor found.');
      return;
    }
    
    // Create context with selection, convert lineRange from null to undefined
    const context: CommandContext = {
      selection,
      fileInfo: fileInfo ? {
        fileName: fileInfo.fileName,
        filePath: fileInfo.filePath,
        language: fileInfo.language,
        lineRange: fileInfo.lineRange || undefined
      } : undefined
    };
    
    // Call original method with context as first argument
    return originalMethod.apply(this, [context, ...args]);
  };
  
  return descriptor;
}

/**
 * Decorator to require authentication
 */
export function requireAuth(provider?: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(this: any, ...args: any[]) {
      const configService = (this as any).configService;
      if (!configService) {
        throw new Error('ConfigurationService not available');
      }
      
      const credentials = await configService.getCredentials(provider);
      if (!credentials) {
        vscode.window.showErrorMessage('Authentication required. Please configure your API key.');
        return;
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Decorator to show progress
 */
export function withProgress(title: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(this: any, ...args: any[]) {
      return vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title,
          cancellable: true
        },
        async (progress, token) => {
          // Add progress to context if first arg is CommandContext
          if (args[0] && typeof args[0] === 'object' && 'selection' in args[0]) {
            args[0].progress = progress;
          }
          
          // Check for cancellation
          if (token.isCancellationRequested) {
            return;
          }
          
          return originalMethod.apply(this, args);
        }
      );
    };
    
    return descriptor;
  };
}

/**
 * Decorator to log command execution
 */
export function logExecution(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(this: any, ...args: any[]) {
    const logger = Logger.getInstance();
    const startTime = Date.now();
    
    logger.info(`Executing command: ${propertyName}`);
    
    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - startTime;
      logger.info(`Command ${propertyName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Command ${propertyName} failed after ${duration}ms:`, error);
      throw error;
    }
  };
  
  return descriptor;
}

/**
 * Decorator to handle errors gracefully
 */
export function handleError(showMessage: boolean = true) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(this: any, ...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const logger = Logger.getInstance();
        logger.error(`Error in ${propertyName}:`, error);
        
        if (showMessage) {
          const message = error instanceof Error ? error.message : 'An unexpected error occurred';
          vscode.window.showErrorMessage(`Learn Linker: ${message}`);
        }
        
        // Re-throw if needed for upstream handling
        if ((this as any).throwErrors) {
          throw error;
        }
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator to track workspace usage
 */
export function trackUsage(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(this: any, ...args: any[]) {
    const result = await originalMethod.apply(this, args);
    
    // Track usage if context is available
    if (args[0] && typeof args[0] === 'object' && 'fileInfo' in args[0]) {
      const context = args[0] as CommandContext;
      const configService = (this as any).configService;
      
      if (configService && context.fileInfo) {
        await configService.updateWorkspaceUsage(
          {
            filePath: context.fileInfo.filePath,
            language: context.fileInfo.language,
            fileName: context.fileInfo.fileName,
            lineRange: context.fileInfo.lineRange
          },
          {
            lastUsedProvider: (this as any).aiService?.getCurrentProvider()
          }
        );
      }
    }
    
    return result;
  };
  
  return descriptor;
}

/**
 * Decorator to validate platform connection
 */
export function requirePlatform(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(this: any, ...args: any[]) {
    const configService = (this as any).configService;
    if (!configService) {
      throw new Error('ConfigurationService not available');
    }
    
    const features = configService.getFeatureStatus();
    if (!features.platform.enabled || features.platform.status !== 'ready') {
      const action = await vscode.window.showErrorMessage(
        'Platform connection is not configured. Would you like to set it up?',
        'Configure',
        'Cancel'
      );
      
      if (action === 'Configure') {
        await vscode.commands.executeCommand('learn-linker.showSettings');
      }
      return;
    }
    
    return originalMethod.apply(this, args);
  };
  
  return descriptor;
}

/**
 * Combined decorator for common command requirements
 */
export function command(options: {
  requireSelection?: boolean;
  requireAuth?: boolean | string;
  requirePlatform?: boolean;
  progress?: string;
  trackUsage?: boolean;
  handleError?: boolean;
}) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    // Apply decorators in order
    
    if (options.handleError) {
      handleError(true)(target, propertyName, descriptor);
    }
    
    if (options.trackUsage) {
      trackUsage(target, propertyName, descriptor);
    }
    
    if (options.progress) {
      withProgress(options.progress)(target, propertyName, descriptor);
    }
    
    if (options.requirePlatform) {
      requirePlatform(target, propertyName, descriptor);
    }
    
    if (options.requireAuth) {
      const provider = typeof options.requireAuth === 'string' ? options.requireAuth : undefined;
      requireAuth(provider)(target, propertyName, descriptor);
    }
    
    if (options.requireSelection) {
      requireSelection(target, propertyName, descriptor);
    }
    
    logExecution(target, propertyName, descriptor);
    
    return descriptor;
  };
}