import * as vscode from 'vscode';
import { Logger } from './logger';

export class Helpers {
  private static logger: Logger = Logger.getInstance();

  /**
   * Get the currently selected text from the active editor
   */
  public static getSelectedText(): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      return null;
    }

    return editor.document.getText(selection);
  }

  /**
   * Get the current file information
   */
  public static getCurrentFileInfo(): {
    filePath: string;
    fileName: string;
    language: string;
    lineRange: { start: number; end: number } | null;
  } | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const document = editor.document;
    const selection = editor.selection;
    const lineRange = selection.isEmpty 
      ? null 
      : { start: selection.start.line + 1, end: selection.end.line + 1 };

    return {
      filePath: document.uri.fsPath,
      fileName: document.fileName,
      language: document.languageId,
      lineRange
    };
  }

  /**
   * Create a debounce function
   */
  public static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(() => {
        func(...args);
        timeout = null;
      }, wait);
    };
  }

  /**
   * Create a throttle function
   */
  public static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * Format file size in human readable format
   */
  public static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Sanitize a string for use in URLs
   */
  public static sanitizeForUrl(str: string): string {
    return str
      .replace(/[^\w\s-]/g, '') // Remove non-word characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase();
  }

  /**
   * Extract code features from selected text (basic implementation)
   */
  public static extractCodeFeatures(code: string, language: string): string[] {
    const features: string[] = [];
    
    // Basic keyword extraction based on language
    if (language === 'javascript' || language === 'typescript') {
      const jsKeywords = [
        'async', 'await', 'Promise', 'then', 'catch', 'finally',
        'fetch', 'axios', 'setTimeout', 'setInterval',
        'map', 'filter', 'reduce', 'forEach', 'find',
        'class', 'extends', 'constructor', 'super',
        'import', 'export', 'require', 'module'
      ];
      
      jsKeywords.forEach(keyword => {
        if (code.includes(keyword)) {
          features.push(keyword);
        }
      });
    } else if (language === 'python') {
      const pythonKeywords = [
        'async', 'await', 'asyncio', 'awaitable',
        'try', 'except', 'finally', 'raise',
        'class', 'def', 'self', 'super',
        'import', 'from', 'as', 'module',
        'for', 'while', 'if', 'elif', 'else'
      ];
      
      pythonKeywords.forEach(keyword => {
        if (code.includes(keyword)) {
          features.push(keyword);
        }
      });
    }
    
    return features;
  }

  /**
   * Generate a unique ID
   */
  public static generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Show a progress notification with async operation
   */
  public static async withProgress<T>(
    title: string,
    operation: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
  ): Promise<T> {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: title,
        cancellable: false
      },
      operation
    );
  }

  /**
   * Open URL in default browser
   */
  public static async openUrl(url: string): Promise<void> {
    try {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    } catch (error) {
      this.logger.error('Failed to open URL:', url, error);
      await vscode.window.showErrorMessage(`Failed to open URL: ${url}`);
    }
  }

  /**
   * Copy text to clipboard
   */
  public static async copyToClipboard(text: string): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(text);
      await vscode.window.showInformationMessage('Copied to clipboard');
    } catch (error) {
      this.logger.error('Failed to copy to clipboard:', error);
      await vscode.window.showErrorMessage('Failed to copy to clipboard');
    }
  }

  /**
   * Get relative path from workspace root
   */
  public static getRelativePath(filePath: string): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return filePath;
    }
    
    const workspacePath = workspaceFolder.uri.fsPath;
    return filePath.replace(workspacePath + '/', '');
  }

  /**
   * Check if a string is empty or whitespace only
   */
  public static isEmpty(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
  }

  /**
   * Truncate string with ellipsis
   */
  public static truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }
}