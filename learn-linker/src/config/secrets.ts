import * as vscode from 'vscode';

export class SecretManager {
  private static instance: SecretManager;
  private context: vscode.ExtensionContext | null = null;

  private constructor() {}

  public static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  public async storePersonalAccessToken(token: string): Promise<void> {
    if (!this.context) {
      throw new Error('SecretManager not initialized');
    }
    await this.context.secrets.store('learnLinker.pat', token);
  }

  public async getPersonalAccessToken(): Promise<string | undefined> {
    if (!this.context) {
      throw new Error('SecretManager not initialized');
    }
    return await this.context.secrets.get('learnLinker.pat');
  }

  public async deletePersonalAccessToken(): Promise<void> {
    if (!this.context) {
      throw new Error('SecretManager not initialized');
    }
    await this.context.secrets.delete('learnLinker.pat');
  }

  public async storeApiKey(provider: string, apiKey: string): Promise<void> {
    if (!this.context) {
      throw new Error('SecretManager not initialized');
    }
    await this.context.secrets.store(`learnLinker.apiKey.${provider}`, apiKey);
  }

  public async getApiKey(provider: string): Promise<string | undefined> {
    if (!this.context) {
      throw new Error('SecretManager not initialized');
    }
    return await this.context.secrets.get(`learnLinker.apiKey.${provider}`);
  }

  public async deleteApiKey(provider: string): Promise<void> {
    if (!this.context) {
      throw new Error('SecretManager not initialized');
    }
    await this.context.secrets.delete(`learnLinker.apiKey.${provider}`);
  }
}