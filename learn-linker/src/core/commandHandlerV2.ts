import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errors';
import { Helpers } from '../utils/helpers';
import { ApiClient } from '../services/api/client';
import { AIService } from '../services/ai/aiService';
import { ExplanationPanel } from '../ui/webview/ExplanationPanel';
import { SaveSnippetRequest } from '../services/api/types';
import { ConfigurationService, FileContext } from '../services/config/configurationService';
import { StorageManager } from '../services/storage/storageManager';
import { ReviewQuality } from '../types/snippet';
import { ASTAnalyzer } from '../services/ast/analyzer';
import { 
  command, 
  CommandContext,
  requireSelection,
  requireAuth,
  requirePlatform,
  withProgress,
  handleError,
  trackUsage,
  logExecution
} from './decorators';

/**
 * Optimized Command Handler using decorators and ConfigurationService
 */
export class CommandHandlerV2 {
  private static instance: CommandHandlerV2;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private configService: ConfigurationService;
  private apiClient: ApiClient | null = null;
  private aiService: AIService;
  private storageManager: StorageManager;
  private astAnalyzer: ASTAnalyzer;
  private context?: vscode.ExtensionContext;
  private lastExplanation?: { 
    code: string; 
    explanation: string; 
    context: FileContext;
    astFeatures?: any; // Store AST analysis results
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.aiService = AIService.getInstance();
    this.storageManager = StorageManager.getInstance();
    this.astAnalyzer = ASTAnalyzer.getInstance();
  }

  public static getInstance(): CommandHandlerV2 {
    if (!CommandHandlerV2.instance) {
      CommandHandlerV2.instance = new CommandHandlerV2();
    }
    return CommandHandlerV2.instance;
  }

  public setContext(context: vscode.ExtensionContext): void {
    this.context = context;
    this.configService.initialize(context);
    
    // Initialize storage manager with configuration
    const storageLocation = vscode.workspace.getConfiguration('learnLinker.storage').get<string>('location', 'workspace');
    this.storageManager.initialize(context, storageLocation === 'global');
  }

  /**
   * Initialize the command handler with smart feature detection
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing CommandHandler V2...');
    
    // Initialize features in parallel
    await this.configService.initializeFeatures();
    
    // Set up configuration change listener
    this.configService.onConfigurationChanged(async (config) => {
      this.logger.info('Configuration changed, reinitializing services...');
      await this.reinitializeServices(config);
    });
    
    // Initialize services based on feature status
    const features = this.configService.getFeatureStatus();
    
    if (features.ai.enabled) {
      await this.initializeAIService();
    }
    
    if (features.platform.enabled) {
      await this.initializePlatformConnection();
    }
    
    this.logger.info('CommandHandler V2 initialized successfully');
  }

  private async initializeAIService(): Promise<void> {
    const config = await this.configService.getConfiguration();
    
    this.logger.info('Initializing AI Service with config:', {
      provider: config.provider,
      hasApiKey: !!config.apiKey,
      model: config.model,
      temperature: config.temperature
    });
    
    if (config.apiKey) {
      const aiConfig = {
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        apiBase: config.apiBase,
        temperature: config.temperature,
        maxTokens: config.maxTokens
      };
      
      const success = await this.aiService.initialize(aiConfig as any);
      if (success) {
        this.logger.info('AI Service initialized successfully');
        this.configService.updateFeatureStatus('ai', { status: 'ready' });
      } else {
        this.logger.error('AI Service initialization failed');
        this.configService.updateFeatureStatus('ai', { status: 'error' });
      }
    } else {
      this.logger.warn('No API key found, AI Service not initialized');
      this.configService.updateFeatureStatus('ai', { status: 'pending' });
    }
  }

  private async initializePlatformConnection(): Promise<void> {
    const config = await this.configService.getConfiguration();
    
    if (config.platformUrl && config.personalAccessToken) {
      this.apiClient = ApiClient.getInstance({
        baseUrl: config.platformUrl,
        authToken: `Bearer ${config.personalAccessToken}`,
        timeout: 30000,
        retries: 3
      });
      
      // Test connection
      try {
        const connected = await this.apiClient.testConnection();
        this.configService.updateFeatureStatus('platform', { 
          status: connected ? 'ready' : 'error' 
        });
      } catch (error) {
        this.configService.updateFeatureStatus('platform', { status: 'error' });
      }
    }
  }

  private async reinitializeServices(config: any): Promise<void> {
    // Reinitialize AI service if provider changed
    if (config.apiKey) {
      await this.initializeAIService();
    }
    
    // Reinitialize platform connection if URL changed
    if (config.platformUrl && config.personalAccessToken) {
      await this.initializePlatformConnection();
    }
  }

  /**
   * Explain selected code with automatic usage tracking
   */
  @command({
    requireSelection: true,
    requireAuth: true,
    progress: 'Explaining code...',
    trackUsage: true,
    handleError: true
  })
  public async explainSelection(context: CommandContext): Promise<void> {
    if (!this.context) {
      throw new Error('Extension context not available');
    }
    
    // Check if AI service is initialized
    const aiStatus = this.aiService.getStatus();
    if (!aiStatus.isReady) {
      this.logger.warn('AI Service not ready, attempting to initialize...');
      await this.initializeAIService();
      
      // Check again after initialization
      const newStatus = this.aiService.getStatus();
      if (!newStatus.isReady) {
        throw new Error('AI Service is not configured. Please check your API key settings.');
      }
    }
    
    // Update progress
    context.progress?.report({ message: 'Analyzing code structure...' });
    
    // Perform AST analysis on selected code
    let astFeatures = null;
    try {
      const astResult = await this.astAnalyzer.analyze(
        context.selection!,
        context.fileInfo!.language,
        {
          includeContext: true,
          includeLocation: false,
          timeout: 3000
        }
      );
      
      if (astResult && !astResult.errors?.length) {
        astFeatures = astResult.matchingFeatures;
        this.logger.info('AST analysis completed', {
          patterns: astFeatures.patterns.length,
          apiCalls: astFeatures.apiSignatures.length,
          complexity: astFeatures.complexity
        });
        
        // Show detailed AST analysis in output channel
        this.logger.showOutputChannel(); // 自动显示输出面板
        this.logger.outputToChannel('\n' + '='.repeat(60));
        this.logger.outputToChannel('🔍 AST 分析结果');
        this.logger.outputToChannel('='.repeat(60));
        
        // Syntax features detected
        if (astFeatures.syntaxFlags.length > 0) {
          this.logger.outputToChannel('\n📌 语法特征:');
          astFeatures.syntaxFlags.forEach(flag => {
            this.logger.outputToChannel(`   • ${flag}`);
          });
        }
        
        // Code patterns detected
        if (astFeatures.patterns.length > 0) {
          this.logger.outputToChannel('\n🎯 代码模式:');
          astFeatures.patterns.forEach(pattern => {
            this.logger.outputToChannel(`   • ${pattern}`);
          });
        }
        
        // API calls detected
        if (astFeatures.apiSignatures.length > 0) {
          this.logger.outputToChannel('\n📞 API 调用:');
          astFeatures.apiSignatures.forEach(api => {
            this.logger.outputToChannel(`   • ${api}`);
          });
        }
        
        // Complexity metrics
        this.logger.outputToChannel('\n📊 复杂度指标:');
        this.logger.outputToChannel(`   • 整体复杂度: ${astFeatures.complexity}`);
        this.logger.outputToChannel(`   • 循环复杂度: ${astResult.features.complexity.cyclomaticComplexity}`);
        this.logger.outputToChannel(`   • 代码行数: ${astResult.features.complexity.lineCount}`);
        this.logger.outputToChannel(`   • 最大深度: ${astResult.features.complexity.maxDepth}`);
        
        // Context hints
        if (astFeatures.contextHints && Object.keys(astFeatures.contextHints).length > 0) {
          this.logger.outputToChannel('\n💡 上下文提示:');
          Object.entries(astFeatures.contextHints).forEach(([key, value]) => {
            if (value) {
              this.logger.outputToChannel(`   • ${key}: ${value}`);
            }
          });
        }
        
        this.logger.outputToChannel('\n' + '='.repeat(60) + '\n');
      }
    } catch (error) {
      this.logger.warn('AST analysis failed, continuing without features', error);
    }
    
    context.progress?.report({ message: 'Analyzing code...' });
    
    // Get workspace config for preferences
    const config = await this.configService.getConfiguration(context.fileInfo as FileContext);
    
    // Use preferred model if available
    if (config.workspaceConfig?.preferredModel) {
      this.logger.info(`Using preferred model: ${config.workspaceConfig.preferredModel}`);
    }
    
    // Get code explanation
    const lineRangeObj = typeof context.fileInfo!.lineRange === 'object' 
      ? context.fileInfo!.lineRange 
      : undefined;
    
    const stream = await this.aiService.explainCode(
      context.selection!,
      {
        language: context.fileInfo!.language,
        fileName: context.fileInfo!.fileName,
        filePath: context.fileInfo!.filePath,
        lineRange: lineRangeObj
      },
      {
        style: 'detailed'
        // TODO: Add customPrompt support to ExplainOptions type
      }
    );
    
    context.progress?.report({ message: 'Opening explanation panel...' });
    
    // Show webview panel - convert lineRange to string for display
    const lineRangeStr = typeof context.fileInfo!.lineRange === 'object' && context.fileInfo!.lineRange
      ? `${context.fileInfo!.lineRange.start}-${context.fileInfo!.lineRange.end}` 
      : typeof context.fileInfo!.lineRange === 'string'
        ? context.fileInfo!.lineRange
        : undefined;
    
    const panel = await ExplanationPanel.show(this.context, {
      code: context.selection!,
      language: context.fileInfo!.language,
      fileName: context.fileInfo!.fileName,
      lineRange: lineRangeStr
    });
    
    context.progress?.report({ message: 'Receiving explanation...' });
    
    // Stream content to panel and collect the explanation
    const fullExplanation = await panel.streamContent(stream);
    
    // Update workspace usage statistics
    const fileContext: FileContext = {
      filePath: context.fileInfo!.filePath,
      language: context.fileInfo!.language,
      fileName: context.fileInfo!.fileName,
      lineRange: context.fileInfo!.lineRange
    };
    
    await this.configService.updateWorkspaceUsage(
      fileContext,
      {
        lastUsedProvider: this.aiService.getCurrentProvider(),
        preferredModel: config.model
      }
    );
    
    // Store the explanation for potential saving
    this.lastExplanation = {
      code: context.selection!,
      explanation: fullExplanation,
      context: fileContext,
      astFeatures // Include AST features for enhanced matching
    };
    
    // Try to get knowledge links if platform is connected
    if (this.apiClient && this.configService.getFeatureStatus().platform.status === 'ready') {
      try {
        context.progress?.report({ message: 'Fetching related knowledge...' });
        
        // Send code with AST features to platform for enhanced matching
        const linksRequest = {
          code: context.selection!,
          language: context.fileInfo!.language,
          filePath: context.fileInfo!.filePath,
          features: astFeatures, // Include AST analysis results
          topK: 5
        };
        
        const knowledgeLinks = await this.apiClient.getLinks(linksRequest as any);
        
        if (knowledgeLinks && knowledgeLinks.length > 0) {
          this.logger.info(`Found ${knowledgeLinks.length} related knowledge links`);
          // TODO: Display knowledge links in the panel
        }
        
        this.logger.debug('Platform features available for knowledge links');
      } catch (error) {
        // Platform features are optional
        this.logger.debug('Platform features not available:', error);
      }
    }
    
    // Show success with save option
    const action = await vscode.window.showInformationMessage(
      'Code explained successfully!',
      'Save to Collection',
      'Review Later'
    );
    
    if (action === 'Save to Collection') {
      await this.saveLastExplanation();
    } else if (action === 'Review Later') {
      await this.saveLastExplanation(true);
    }
  }

  /**
   * Save code snippet for review (uses local storage)
   */
  @command({
    requireSelection: true,
    progress: 'Saving code for review...',
    handleError: true,
    trackUsage: true
  })
  public async saveToReview(context: CommandContext): Promise<void> {
    // Ask for note
    const note = await vscode.window.showInputBox({
      prompt: 'Add a note for this code snippet (optional)',
      placeHolder: 'Why are you saving this code? What makes it interesting?'
    });
    
    context.progress?.report({ message: 'Saving snippet...' });
    
    // Convert to CodeContext format
    const codeContext = {
      language: context.fileInfo?.language,
      fileName: context.fileInfo?.fileName,
      filePath: context.fileInfo?.filePath,
      lineRange: typeof context.fileInfo?.lineRange === 'object' ? context.fileInfo.lineRange : undefined
    };
    
    // Save to local storage
    const snippet = await this.storageManager.saveManually(
      context.selection!,
      codeContext,
      {
        userNotes: note || undefined
      }
    );
    
    this.logger.info('Snippet saved to local storage', { id: snippet.id });
    
    // If platform is connected, also sync to platform
    if (this.apiClient && this.configService.getFeatureStatus().platform.status === 'ready') {
      const platformEnabled = vscode.workspace.getConfiguration('learnLinker.platform.features').get<boolean>('snippetSync', true);
      
      if (platformEnabled) {
        try {
          context.progress?.report({ message: 'Syncing to platform...' });
          
          // Extract code features for platform
          const features = Helpers.extractCodeFeatures(
            context.selection!, 
            context.fileInfo!.language
          );
          
          const saveRequest: SaveSnippetRequest = {
            code: context.selection!,
            language: context.fileInfo!.language as any,
            filePath: Helpers.getRelativePath(context.fileInfo!.filePath),
            repo: context.fileInfo!.fileName,
            tags: features,
            note: note || undefined
          };
          
          await this.apiClient.saveSnippet(saveRequest);
          this.logger.debug('Snippet also synced to platform');
        } catch (error) {
          // Platform sync is optional, don't fail the operation
          this.logger.warn('Failed to sync snippet to platform', error);
        }
      }
    }
  }

  /**
   * Open learning platform with deep linking
   */
  @logExecution
  @handleError()
  public async openInLearningPlatform(): Promise<void> {
    const config = await this.configService.getConfiguration();
    
    if (!config.platformUrl) {
      vscode.window.showErrorMessage('Please configure the learning platform URL in settings.');
      return;
    }
    
    // Get selected text for deep linking
    const selectedText = Helpers.getSelectedText();
    const fileInfo = Helpers.getCurrentFileInfo();
    
    let deepLinkUrl = config.platformUrl;
    
    if (selectedText && fileInfo) {
      const encodedCode = encodeURIComponent(selectedText);
      deepLinkUrl = `${config.platformUrl}/learn?language=${fileInfo.language}&highlight=${encodedCode}`;
      
      // Track usage
      const fileContext: FileContext = {
        filePath: fileInfo.filePath,
        language: fileInfo.language,
        fileName: fileInfo.fileName,
        lineRange: fileInfo.lineRange || undefined
      };
      await this.configService.updateWorkspaceUsage(fileContext, {});
    }
    
    await Helpers.openUrl(deepLinkUrl);
    this.logger.info('Opened learning platform', { url: deepLinkUrl });
  }

  /**
   * Show settings UI
   */
  @logExecution
  public async showSettings(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'learnLinker');
  }

  /**
   * Test platform connection
   */
  @withProgress('Testing connection...')
  @handleError()
  public async testConnection(context?: CommandContext): Promise<void> {
    context?.progress?.report({ message: 'Validating configuration...' });
    
    const config = await this.configService.getConfiguration();
    const features = this.configService.getFeatureStatus();
    
    const results: string[] = [];
    
    // Test AI
    if (features.ai.enabled) {
      if (features.ai.status === 'ready') {
        results.push('✅ AI Service: Connected');
      } else {
        results.push('❌ AI Service: Not configured');
      }
    }
    
    // Test Platform
    if (features.platform.enabled) {
      context?.progress?.report({ message: 'Testing platform connection...' });
      
      if (this.apiClient) {
        try {
          const connected = await this.apiClient.testConnection();
          if (connected) {
            results.push('✅ Platform: Connected');
          } else {
            results.push('❌ Platform: Connection failed');
          }
        } catch (error) {
          results.push('❌ Platform: ' + (error as Error).message);
        }
      } else {
        results.push('❌ Platform: Not configured');
      }
    }
    
    // Test Storage
    if (features.storage.enabled) {
      results.push('✅ Local Storage: Enabled');
    }
    
    // Show results
    const message = results.join('\n');
    if (results.every(r => r.startsWith('✅'))) {
      vscode.window.showInformationMessage('All services connected!\n' + message);
    } else {
      vscode.window.showWarningMessage('Service Status:\n' + message);
    }
  }

  /**
   * Clear workspace cache
   */
  @logExecution
  public async clearCache(): Promise<void> {
    const action = await vscode.window.showWarningMessage(
      'Clear all workspace configurations and cache?',
      'Clear Current File',
      'Clear All',
      'Cancel'
    );
    
    if (action === 'Clear Current File') {
      const fileInfo = Helpers.getCurrentFileInfo();
      if (fileInfo) {
        await this.configService.clearCache(fileInfo.filePath);
        vscode.window.showInformationMessage('Cache cleared for current file');
      }
    } else if (action === 'Clear All') {
      await this.configService.clearCache();
      vscode.window.showInformationMessage('All workspace cache cleared');
    }
  }

  /**
   * Get current AI service provider
   */
  public getCurrentProvider(): string | undefined {
    return this.aiService.getCurrentProvider();
  }

  // ==================== New Storage Commands ====================
  
  /**
   * Save the last explanation to storage
   */
  private async saveLastExplanation(quickSave: boolean = false): Promise<void> {
    if (!this.lastExplanation) {
      vscode.window.showWarningMessage('No explanation to save');
      return;
    }
    
    const { code, explanation, context } = this.lastExplanation;
    
    // Convert FileContext to CodeContext
    const codeContext = {
      language: context.language,
      fileName: context.fileName,
      filePath: context.filePath,
      lineRange: typeof context.lineRange === 'object' ? context.lineRange : undefined
    };
    
    if (quickSave) {
      // Quick save without prompting
      await this.storageManager.saveFromExplanation(
        code,
        explanation,
        codeContext
      );
    } else {
      // Ask for additional notes
      const note = await vscode.window.showInputBox({
        prompt: 'Add a note about this code (optional)',
        placeHolder: 'What did you learn? Any insights?'
      });
      
      await this.storageManager.saveFromExplanation(
        code,
        explanation,
        codeContext,
        note
      );
    }
  }
  
  /**
   * Show snippet collection
   */
  @logExecution
  public async showSnippetCollection(): Promise<void> {
    const snippets = await this.storageManager.searchSnippets({
      sortBy: 'date',
      sortOrder: 'desc'
    });
    
    if (snippets.length === 0) {
      vscode.window.showInformationMessage('No snippets saved yet. Save some code to build your collection!');
      return;
    }
    
    // Show quick pick with snippets
    const items = snippets.map(s => ({
      label: `$(code) ${s.language} - ${s.difficulty}`,
      description: s.tags.slice(0, 3).join(', '),
      detail: s.code.split('\n')[0].substring(0, 50) + '...',
      snippet: s
    }));
    
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a snippet to view',
      matchOnDescription: true,
      matchOnDetail: true
    });
    
    if (selected) {
      await this.viewSnippet(selected.snippet.id);
    }
  }
  
  /**
   * View a specific snippet
   */
  private async viewSnippet(id: string): Promise<void> {
    const snippet = await this.storageManager.getSnippet(id);
    
    if (!snippet) {
      vscode.window.showErrorMessage('Snippet not found');
      return;
    }
    
    const s = snippet;
    
    // Create a virtual document to show the snippet
    const content = `# Code Snippet
Language: ${s.language} | Difficulty: ${s.difficulty}
Tags: ${s.tags.join(', ')}
Created: ${new Date(s.createdAt).toLocaleDateString()}

## Code
\`\`\`${s.language}
${s.code}
\`\`\`

${s.explanation ? `## Explanation\n${s.explanation}\n\n` : ''}
${s.userNotes ? `## Notes\n${s.userNotes}\n\n` : ''}
${s.keyPoints?.length ? `## Key Points\n${s.keyPoints.map(p => `- ${p}`).join('\n')}\n\n` : ''}

---
Review Count: ${s.reviewCount}
Mastered: ${s.mastered ? 'Yes' : 'No'}
Next Review: ${s.nextReviewDate ? new Date(s.nextReviewDate).toLocaleDateString() : 'Not scheduled'}
`;
    
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown'
    });
    
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  }
  
  /**
   * Show snippets for review
   */
  @logExecution
  public async showReviewQueue(): Promise<void> {
    const snippets = await this.storageManager.getSnippetsForReview();
    
    if (snippets.length === 0) {
      vscode.window.showInformationMessage('No snippets need review right now. Keep learning!');
      return;
    }
    
    vscode.window.showInformationMessage(
      `You have ${snippets.length} snippet(s) ready for review!`,
      'Start Review'
    ).then(async (choice) => {
      if (choice === 'Start Review') {
        await this.startReviewSession(snippets[0].id);
      }
    });
  }
  
  /**
   * Start a review session
   */
  private async startReviewSession(snippetId: string): Promise<void> {
    await this.viewSnippet(snippetId);
    
    // Ask for review quality
    const quality = await vscode.window.showQuickPick([
      { label: '😭 Complete Blackout', value: ReviewQuality.Complete_Blackout },
      { label: '😕 Incorrect - Hard', value: ReviewQuality.Incorrect_Hard },
      { label: '🤔 Incorrect - Familiar', value: ReviewQuality.Incorrect_Easy },
      { label: '😐 Correct - Hard', value: ReviewQuality.Correct_Hard },
      { label: '🙂 Correct - Medium', value: ReviewQuality.Correct_Medium },
      { label: '😄 Perfect Recall', value: ReviewQuality.Perfect }
    ], {
      placeHolder: 'How well did you recall this concept?'
    });
    
    if (quality) {
      await this.storageManager.markAsReviewed(snippetId, quality.value);
      
      // Check for more reviews
      const remaining = await this.storageManager.getSnippetsForReview();
      if (remaining.length > 0) {
        const next = await vscode.window.showInformationMessage(
          `Good job! ${remaining.length} more to review.`,
          'Next',
          'Stop'
        );
        
        if (next === 'Next') {
          await this.startReviewSession(remaining[0].id);
        }
      } else {
        vscode.window.showInformationMessage('Review session complete! Great work! 🎉');
      }
    }
  }
  
  /**
   * Export snippets
   */
  @logExecution
  public async exportSnippets(): Promise<void> {
    const format = await vscode.window.showQuickPick([
      { label: 'JSON', value: 'json', description: 'Full data with metadata' },
      { label: 'Markdown', value: 'markdown', description: 'Human-readable format' },
      { label: 'HTML', value: 'html', description: 'Web page with syntax highlighting' }
    ], {
      placeHolder: 'Select export format'
    });
    
    if (format) {
      await this.storageManager.export({
        format: format.value as any,
        includeExplanations: true,
        includeUserNotes: true,
        includeMetadata: true
      });
    }
  }
  
  /**
   * Import snippets
   */
  @logExecution
  public async importSnippets(): Promise<void> {
    const result = await this.storageManager.import();
    
    if (result) {
      if (result.success) {
        vscode.window.showInformationMessage(
          `Import successful! ${result.imported} snippets imported.`
        );
      } else {
        vscode.window.showErrorMessage(
          `Import failed: ${result.errors.join(', ')}`
        );
      }
    }
  }
  
  /**
   * Show learning statistics
   */
  @logExecution
  public async showStatistics(): Promise<void> {
    const stats = await this.storageManager.getStatistics();
    
    const message = `📊 Learning Statistics

Total Snippets: ${stats.totalSnippets}
Mastered: ${stats.masteredSnippets} (${Math.round(stats.masteredSnippets / Math.max(stats.totalSnippets, 1) * 100)}%)
Pending Review: ${stats.pendingReview}
Overdue: ${stats.overdueReview}

By Difficulty:
  Easy: ${stats.byDifficulty.easy}
  Medium: ${stats.byDifficulty.medium}
  Hard: ${stats.byDifficulty.hard}

Average Reviews: ${stats.averageReviewCount.toFixed(1)}
${stats.lastActivityDate ? `Last Activity: ${new Date(stats.lastActivityDate).toLocaleDateString()}` : ''}`;
    
    const doc = await vscode.workspace.openTextDocument({
      content: message,
      language: 'markdown'
    });
    
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  }
}