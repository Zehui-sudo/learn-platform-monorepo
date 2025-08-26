/**
 * Quick AI Provider Test
 * This script can be run directly to test AI configuration
 */

import * as vscode from 'vscode';
import { AIService } from '../services/ai/aiService';

export async function quickTestAI() {
  const aiService = AIService.getInstance();
  
  // Load configuration from VS Code settings
  const config = AIService.loadConfigFromSettings();
  
  if (!config) {
    vscode.window.showErrorMessage(
      'AI configuration not found. Please configure AI settings first.'
    );
    
    // Prompt for configuration
    const newConfig = await AIService.promptForConfiguration();
    if (!newConfig) {
      return;
    }
    
    const success = await aiService.initialize(newConfig);
    if (!success) {
      vscode.window.showErrorMessage('Failed to initialize AI service');
      return;
    }
  } else {
    // Initialize with existing config
    const success = await aiService.initialize(config);
    if (!success) {
      vscode.window.showErrorMessage('Failed to initialize AI service');
      return;
    }
  }
  
  // Test code
  const testCode = `
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  const left = arr.slice(1).filter(x => x < pivot);
  const right = arr.slice(1).filter(x => x >= pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
}`;

  try {
    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Testing AI Provider',
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: 'Connecting to AI provider...' });
        
        // Test connection
        const isConnected = await aiService.testConnection();
        if (!isConnected) {
          throw new Error('Connection test failed');
        }
        
        progress.report({ message: 'Requesting code explanation...' });
        
        // Get explanation
        const stream = await aiService.explainCode(testCode, {
          language: 'javascript',
          fileName: 'test.js'
        });
        
        // Read stream
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let result = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
        
        // Show result in output channel
        const outputChannel = vscode.window.createOutputChannel('AI Test Result');
        outputChannel.clear();
        outputChannel.appendLine('=== AI Provider Test Result ===\n');
        outputChannel.appendLine(`Provider: ${aiService.getProviderInfo()?.name}`);
        outputChannel.appendLine(`Model: ${aiService.getProviderInfo()?.model}\n`);
        outputChannel.appendLine('Test Code:');
        outputChannel.appendLine(testCode);
        outputChannel.appendLine('\n=== Explanation ===\n');
        outputChannel.appendLine(result);
        outputChannel.show();
        
        vscode.window.showInformationMessage(
          `✅ AI Provider test successful! Check the output panel for details.`
        );
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `AI Provider test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Export for use in commands
export function registerTestCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'learn-linker.testAI',
    quickTestAI
  );
  context.subscriptions.push(disposable);
}