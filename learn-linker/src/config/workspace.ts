import * as vscode from 'vscode';

export interface WorkspaceConfig {
  language: string;
  filePath: string;
  repoName?: string;
  lastUsedProvider?: string;
  customSettings?: Record<string, any>;
}

export class WorkspaceConfigManager {
  private static instance: WorkspaceConfigManager;
  private context: vscode.ExtensionContext | null = null;

  private constructor() {}

  public static getInstance(): WorkspaceConfigManager {
    if (!WorkspaceConfigManager.instance) {
      WorkspaceConfigManager.instance = new WorkspaceConfigManager();
    }
    return WorkspaceConfigManager.instance;
  }

  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  public getCurrentWorkspaceConfig(): WorkspaceConfig | null {
    if (!this.context) {
      return null;
    }

    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return null;
    }

    const document = activeEditor.document;
    const filePath = document.uri.fsPath;
    const language = document.languageId;

    // Try to get repo name from git
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    let repoName: string | undefined;
    
    if (workspaceFolder) {
      repoName = workspaceFolder.name;
    }

    return {
      language,
      filePath,
      repoName
    };
  }

  public async saveWorkspaceConfig(config: WorkspaceConfig): Promise<void> {
    if (!this.context) {
      throw new Error('WorkspaceConfigManager not initialized');
    }

    const workspaceConfigs = this.getWorkspaceConfigs();
    const key = this.getWorkspaceKey(config.filePath);
    
    workspaceConfigs[key] = config;
    
    await this.context.globalState.update('workspaceConfigs', workspaceConfigs);
  }

  public getWorkspaceConfig(filePath: string): WorkspaceConfig | null {
    if (!this.context) {
      return null;
    }

    const workspaceConfigs = this.getWorkspaceConfigs();
    const key = this.getWorkspaceKey(filePath);
    
    return workspaceConfigs[key] || null;
  }

  public async updateWorkspaceConfig(filePath: string, updates: Partial<WorkspaceConfig>): Promise<void> {
    if (!this.context) {
      throw new Error('WorkspaceConfigManager not initialized');
    }

    const workspaceConfigs = this.getWorkspaceConfigs();
    const key = this.getWorkspaceKey(filePath);
    
    if (workspaceConfigs[key]) {
      workspaceConfigs[key] = { ...workspaceConfigs[key], ...updates };
      await this.context.globalState.update('workspaceConfigs', workspaceConfigs);
    }
  }

  private getWorkspaceConfigs(): Record<string, WorkspaceConfig> {
    if (!this.context) {
      return {};
    }
    
    return this.context.globalState.get<Record<string, WorkspaceConfig>>('workspaceConfigs') || {};
  }

  private getWorkspaceKey(filePath: string): string {
    // Normalize file path to create a consistent key
    return filePath.replace(/\\/g, '/').toLowerCase();
  }

  public async clearWorkspaceConfig(filePath: string): Promise<void> {
    if (!this.context) {
      throw new Error('WorkspaceConfigManager not initialized');
    }

    const workspaceConfigs = this.getWorkspaceConfigs();
    const key = this.getWorkspaceKey(filePath);
    
    if (workspaceConfigs[key]) {
      delete workspaceConfigs[key];
      await this.context.globalState.update('workspaceConfigs', workspaceConfigs);
    }
  }

  public async clearAllWorkspaceConfigs(): Promise<void> {
    if (!this.context) {
      throw new Error('WorkspaceConfigManager not initialized');
    }

    await this.context.globalState.update('workspaceConfigs', {});
  }
}