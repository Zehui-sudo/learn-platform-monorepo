import * as vscode from 'vscode';

export interface LearnLinkerSettings {
  platformUrl: string;
  personalAccessToken: string;
  sendStrategy: 'summary' | 'fullCode';
  provider: 'openai' | 'anthropic' | 'deepseek' | 'doubao';
}

export const DEFAULT_SETTINGS: LearnLinkerSettings = {
  platformUrl: 'http://localhost:3000',
  personalAccessToken: '',
  sendStrategy: 'summary',
  provider: 'openai'
};

export class SettingsManager {
  private static instance: SettingsManager;
  private context: vscode.ExtensionContext | null = null;

  private constructor() {}

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  public getSettings(): LearnLinkerSettings {
    const config = vscode.workspace.getConfiguration('learnLinker');
    return {
      platformUrl: config.get<string>('platformUrl', DEFAULT_SETTINGS.platformUrl),
      personalAccessToken: config.get<string>('personalAccessToken', DEFAULT_SETTINGS.personalAccessToken),
      sendStrategy: config.get<'summary' | 'fullCode'>('sendStrategy', DEFAULT_SETTINGS.sendStrategy),
      provider: config.get<'openai' | 'anthropic' | 'deepseek' | 'doubao'>('provider', DEFAULT_SETTINGS.provider)
    };
  }

  public async updateSettings(settings: Partial<LearnLinkerSettings>): Promise<void> {
    const config = vscode.workspace.getConfiguration('learnLinker');
    
    if (settings.platformUrl !== undefined) {
      await config.update('platformUrl', settings.platformUrl, vscode.ConfigurationTarget.Global);
    }
    
    if (settings.personalAccessToken !== undefined) {
      await config.update('personalAccessToken', settings.personalAccessToken, vscode.ConfigurationTarget.Global);
    }
    
    if (settings.sendStrategy !== undefined) {
      await config.update('sendStrategy', settings.sendStrategy, vscode.ConfigurationTarget.Global);
    }
    
    if (settings.provider !== undefined) {
      await config.update('provider', settings.provider, vscode.ConfigurationTarget.Global);
    }
  }

  public async showSettingsUI(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'learnLinker');
  }
}