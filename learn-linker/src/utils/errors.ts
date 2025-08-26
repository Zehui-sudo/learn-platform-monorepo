import * as vscode from 'vscode';
import { Logger } from './logger';

export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  API_ERROR = 'API_ERROR',
  SELECTION_ERROR = 'SELECTION_ERROR',
  PARSE_ERROR = 'PARSE_ERROR'
}

export class LearnLinkerError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;

  constructor(message: string, code: ErrorCode = ErrorCode.UNKNOWN, details?: any) {
    super(message);
    this.name = 'LearnLinkerError';
    this.code = code;
    this.details = details;
  }

  static fromError(error: any): LearnLinkerError {
    if (error instanceof LearnLinkerError) {
      return error;
    }

    if (error instanceof Error) {
      return new LearnLinkerError(error.message, ErrorCode.UNKNOWN, { stack: error.stack });
    }

    return new LearnLinkerError(String(error), ErrorCode.UNKNOWN);
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public async handleError(error: any, context?: string): Promise<void> {
    const learnLinkerError = LearnLinkerError.fromError(error);
    
    this.logger.error(`Error in ${context || 'unknown context'}:`, learnLinkerError.message, learnLinkerError.code, learnLinkerError.details);
    
    // Show user-friendly message based on error code
    let userMessage = 'An error occurred in Learn Linker.';
    let showDetails = false;
    
    switch (learnLinkerError.code) {
      case ErrorCode.NETWORK_ERROR:
        userMessage = 'Network error occurred. Please check your internet connection and try again.';
        break;
      case ErrorCode.AUTH_ERROR:
        userMessage = 'Authentication failed. Please check your Personal Access Token in settings.';
        showDetails = true;
        break;
      case ErrorCode.CONFIG_ERROR:
        userMessage = 'Configuration error. Please check your Learn Linker settings.';
        showDetails = true;
        break;
      case ErrorCode.API_ERROR:
        userMessage = 'API error occurred. The service might be temporarily unavailable.';
        break;
      case ErrorCode.SELECTION_ERROR:
        userMessage = 'Please select some code to use this feature.';
        break;
      case ErrorCode.PARSE_ERROR:
        userMessage = 'Failed to parse the selected code. Please try a different selection.';
        break;
      default:
        userMessage = 'An unexpected error occurred. Please check the output panel for details.';
        showDetails = true;
    }
    
    const actions: string[] = ['OK'];
    
    if (showDetails) {
      actions.push('Show Details');
    }
    
    if (learnLinkerError.code === ErrorCode.AUTH_ERROR || learnLinkerError.code === ErrorCode.CONFIG_ERROR) {
      actions.push('Open Settings');
    }
    
    const result = await vscode.window.showErrorMessage(userMessage, ...actions);
    
    if (result === 'Show Details') {
      this.showErrorDetails(learnLinkerError);
    } else if (result === 'Open Settings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'learnLinker');
    }
  }

  private showErrorDetails(error: LearnLinkerError): void {
    const details = [
      `Error: ${error.message}`,
      `Code: ${error.code}`,
      '',
      'Stack Trace:',
      error.stack || 'No stack trace available'
    ];
    
    if (error.details) {
      details.push('', 'Additional Details:');
      details.push(JSON.stringify(error.details, null, 2));
    }
    
    const outputChannel = vscode.window.createOutputChannel('Learn Linker Error Details');
    outputChannel.appendLine(details.join('\n'));
    outputChannel.show();
  }

  public async handleAsync<T>(
    operation: () => Promise<T>,
    context: string,
    fallbackValue?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      await this.handleError(error, context);
      return fallbackValue;
    }
  }

  public wrapAsync<T>(
    operation: () => Promise<T>,
    context: string,
    fallbackValue?: T
  ): () => Promise<T | undefined> {
    return () => this.handleAsync(operation, context, fallbackValue);
  }
}

// Utility function to create async error handlers
export function createErrorHandler<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackValue?: T
): () => Promise<T | undefined> {
  return ErrorHandler.getInstance().wrapAsync(operation, context, fallbackValue);
}