import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private context: vscode.ExtensionContext | null = null;
  private outputChannel: vscode.OutputChannel | null = null;
  private currentLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('Learn Linker');
    
    // Load log level from configuration
    const config = vscode.workspace.getConfiguration('learnLinker');
    const logLevel = config.get<string>('logLevel', 'info');
    
    switch (logLevel.toLowerCase()) {
      case 'debug':
        this.currentLevel = LogLevel.DEBUG;
        break;
      case 'info':
        this.currentLevel = LogLevel.INFO;
        break;
      case 'warn':
        this.currentLevel = LogLevel.WARN;
        break;
      case 'error':
        this.currentLevel = LogLevel.ERROR;
        break;
      default:
        this.currentLevel = LogLevel.INFO;
    }
  }

  public debug(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, ...args);
    }
  }

  public info(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      this.log('INFO', message, ...args);
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.WARN) {
      this.log('WARN', message, ...args);
    }
  }

  public error(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      this.log('ERROR', message, ...args);
    }
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (args.length > 0) {
      const formattedArgs = args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg);
        }
        return String(arg);
      }).join(' ');
      
      this.outputChannel?.appendLine(`${formattedMessage} ${formattedArgs}`);
    } else {
      this.outputChannel?.appendLine(formattedMessage);
    }
    
    // Also log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log(formattedMessage, ...args);
    }
  }

  public show(): void {
    this.outputChannel?.show();
  }

  public dispose(): void {
    this.outputChannel?.dispose();
  }
}