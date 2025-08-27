/**
 * Storage Manager - High-level storage operations and business logic
 * 
 * This manager coordinates between the storage adapter and export service,
 * providing a unified interface for all storage-related operations.
 */

import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { 
  CodeSnippet, 
  SnippetCollection,
  ReviewQuality,
  SearchCriteria,
  LearningStatistics,
  ImportResult,
  ExportOptions
} from '../../types/snippet';
import { LocalStorageAdapter } from './localStorageAdapter';
import { ExportService } from './exportService';
import { Logger } from '../../utils/logger';
import { CodeContext } from '../../services/ai/types';

/**
 * SuperMemo2 algorithm parameters
 */
interface SM2Result {
  interval: number;
  repetition: number;
  easeFactor: number;
}

/**
 * Storage manager for code snippets
 */
export class StorageManager {
  private static instance: StorageManager;
  private adapter: LocalStorageAdapter;
  private exportService: ExportService;
  private logger: Logger;
  private initialized: boolean = false;
  
  private constructor() {
    this.adapter = LocalStorageAdapter.getInstance();
    this.exportService = ExportService.getInstance();
    this.logger = Logger.getInstance();
  }
  
  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }
  
  /**
   * Initialize the storage manager
   */
  public initialize(context: vscode.ExtensionContext, useGlobalStorage: boolean = true): void {
    this.adapter.initialize(context, useGlobalStorage);
    this.initialized = true;
    this.logger.info('StorageManager initialized');
  }
  
  // ==================== Save Operations ====================
  
  /**
   * Save code snippet from AI explanation
   */
  public async saveFromExplanation(
    code: string,
    explanation: string,
    context: CodeContext,
    userNotes?: string
  ): Promise<CodeSnippet> {
    this.ensureInitialized();
    
    const snippet: CodeSnippet = {
      id: uuidv4(),
      code,
      explanation,
      language: context.language || 'plaintext',
      filePath: context.filePath,
      fileName: context.fileName,
      lineRange: context.lineRange ? `${context.lineRange.start}-${context.lineRange.end}` : undefined,
      difficulty: this.assessDifficulty(code, explanation),
      tags: this.extractTags(code, explanation, context.language),
      category: this.categorizeSnippet(code, explanation),
      reviewCount: 0,
      mastered: false,
      easeFactor: 2.5,
      interval: 1,
      userNotes,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'ai-explain'
    };
    
    // Extract key points from explanation
    snippet.keyPoints = this.extractKeyPoints(explanation);
    
    // Set initial review date (tomorrow)
    snippet.nextReviewDate = this.addDays(new Date(), 1);
    
    await this.adapter.saveSnippet(snippet);
    
    this.logger.info('Snippet saved from explanation', { id: snippet.id });
    
    // Show success message with options
    const action = await vscode.window.showInformationMessage(
      'Code snippet saved for review!',
      'View Collection',
      'Add Note'
    );
    
    if (action === 'Add Note') {
      await this.promptForNote(snippet.id);
    } else if (action === 'View Collection') {
      await vscode.commands.executeCommand('learn-linker.showSnippetCollection');
    }
    
    return snippet;
  }
  
  /**
   * Save code snippet manually
   */
  public async saveManually(
    code: string,
    context: CodeContext,
    options?: {
      explanation?: string;
      userNotes?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      tags?: string[];
    }
  ): Promise<CodeSnippet> {
    this.ensureInitialized();
    
    const snippet: CodeSnippet = {
      id: uuidv4(),
      code,
      explanation: options?.explanation,
      language: context.language || 'plaintext',
      filePath: context.filePath,
      fileName: context.fileName,
      lineRange: context.lineRange ? `${context.lineRange.start}-${context.lineRange.end}` : undefined,
      difficulty: options?.difficulty || 'medium',
      tags: options?.tags || this.extractTags(code, options?.explanation || '', context.language),
      reviewCount: 0,
      mastered: false,
      easeFactor: 2.5,
      interval: 1,
      userNotes: options?.userNotes,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'manual'
    };
    
    snippet.nextReviewDate = this.addDays(new Date(), 1);
    
    await this.adapter.saveSnippet(snippet);
    
    this.logger.info('Snippet saved manually', { id: snippet.id });
    
    return snippet;
  }
  
  // ==================== Review Operations ====================
  
  /**
   * Get snippets that need review
   */
  public async getSnippetsForReview(): Promise<CodeSnippet[]> {
    this.ensureInitialized();
    return this.adapter.getSnippetsForReview();
  }
  
  /**
   * Mark snippet as reviewed and calculate next review date
   */
  public async markAsReviewed(id: string, quality: ReviewQuality): Promise<void> {
    this.ensureInitialized();
    
    const snippet = await this.adapter.getSnippet(id);
    if (!snippet) {
      throw new Error(`Snippet not found: ${id}`);
    }
    
    // Calculate next review using SuperMemo2
    const sm2Result = this.calculateSM2(
      quality,
      snippet.interval || 1,
      snippet.easeFactor || 2.5,
      snippet.reviewCount
    );
    
    const updates: Partial<CodeSnippet> = {
      reviewCount: snippet.reviewCount + 1,
      lastReviewDate: new Date(),
      nextReviewDate: this.addDays(new Date(), sm2Result.interval),
      easeFactor: sm2Result.easeFactor,
      interval: sm2Result.interval,
      mastered: quality >= ReviewQuality.Perfect && snippet.reviewCount >= 5
    };
    
    await this.adapter.updateSnippet(id, updates);
    
    this.logger.info('Snippet marked as reviewed', { 
      id, 
      quality, 
      nextInterval: sm2Result.interval 
    });
  }
  
  /**
   * Reset review schedule for a snippet
   */
  public async resetReviewSchedule(id: string): Promise<void> {
    this.ensureInitialized();
    
    await this.adapter.updateSnippet(id, {
      reviewCount: 0,
      lastReviewDate: undefined,
      nextReviewDate: this.addDays(new Date(), 1),
      easeFactor: 2.5,
      interval: 1,
      mastered: false
    });
    
    this.logger.info('Review schedule reset', { id });
  }
  
  // ==================== Query Operations ====================
  
  /**
   * Search snippets with criteria
   */
  public async searchSnippets(criteria: SearchCriteria): Promise<CodeSnippet[]> {
    this.ensureInitialized();
    return this.adapter.searchSnippets(criteria);
  }
  
  /**
   * Get a single snippet by ID
   */
  public async getSnippet(id: string): Promise<CodeSnippet | undefined> {
    this.ensureInitialized();
    return this.adapter.getSnippet(id);
  }
  
  /**
   * Get all snippets
   */
  public async getAllSnippets(): Promise<CodeSnippet[]> {
    this.ensureInitialized();
    return this.adapter.getAllSnippets();
  }
  
  /**
   * Get learning statistics
   */
  public async getStatistics(): Promise<LearningStatistics> {
    this.ensureInitialized();
    
    const snippets = await this.adapter.getAllSnippets();
    const now = new Date();
    
    const stats: LearningStatistics = {
      totalSnippets: snippets.length,
      masteredSnippets: snippets.filter(s => s.mastered).length,
      pendingReview: 0,
      overdueReview: 0,
      byLanguage: {},
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      averageReviewCount: 0,
      streakDays: 0,
      lastActivityDate: undefined
    };
    
    let totalReviews = 0;
    
    for (const snippet of snippets) {
      // Language stats
      stats.byLanguage[snippet.language] = (stats.byLanguage[snippet.language] || 0) + 1;
      
      // Difficulty stats
      stats.byDifficulty[snippet.difficulty]++;
      
      // Review stats
      totalReviews += snippet.reviewCount;
      
      if (snippet.nextReviewDate) {
        const reviewDate = new Date(snippet.nextReviewDate);
        if (reviewDate <= now && !snippet.mastered) {
          stats.pendingReview++;
          if (reviewDate < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
            stats.overdueReview++;
          }
        }
      }
      
      // Track last activity
      if (snippet.lastReviewDate) {
        const reviewDate = new Date(snippet.lastReviewDate);
        if (!stats.lastActivityDate || reviewDate > stats.lastActivityDate) {
          stats.lastActivityDate = reviewDate;
        }
      }
    }
    
    stats.averageReviewCount = snippets.length > 0 ? totalReviews / snippets.length : 0;
    
    return stats;
  }
  
  // ==================== Collection Operations ====================
  
  /**
   * Create a new collection
   */
  public async createCollection(
    name: string,
    description?: string,
    snippetIds?: string[]
  ): Promise<SnippetCollection> {
    this.ensureInitialized();
    
    const collection: SnippetCollection = {
      id: uuidv4(),
      name,
      description,
      snippetIds: snippetIds || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.adapter.saveCollection(collection);
    
    this.logger.info('Collection created', { id: collection.id, name });
    
    return collection;
  }
  
  /**
   * Add snippet to collection
   */
  public async addToCollection(collectionId: string, snippetId: string): Promise<void> {
    this.ensureInitialized();
    
    const collections = await this.adapter.getAllCollections();
    const collection = collections.find(c => c.id === collectionId);
    
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }
    
    if (!collection.snippetIds.includes(snippetId)) {
      collection.snippetIds.push(snippetId);
      collection.updatedAt = new Date();
      await this.adapter.saveCollection(collection);
    }
    
    this.logger.info('Snippet added to collection', { collectionId, snippetId });
  }
  
  // ==================== Export/Import Operations ====================
  
  /**
   * Export snippets
   */
  public async export(options?: ExportOptions): Promise<void> {
    this.ensureInitialized();
    
    const snippets = await this.adapter.getAllSnippets();
    const collections = await this.adapter.getAllCollections();
    
    if (snippets.length === 0) {
      vscode.window.showInformationMessage('No snippets to export');
      return;
    }
    
    const format = options?.format || 'json';
    let content: string;
    
    switch (format) {
      case 'markdown':
        content = await this.exportService.exportToMarkdown(snippets, options);
        break;
      case 'html':
        content = await this.exportService.exportToHTML(snippets, options);
        break;
      default:
        content = await this.exportService.exportToJSON(snippets, collections, options);
    }
    
    await this.exportService.saveToFile(content, format);
  }
  
  /**
   * Import snippets
   */
  public async import(): Promise<ImportResult | undefined> {
    this.ensureInitialized();
    
    const result = await this.exportService.importFromFile();
    
    if (result && result.success) {
      // Get the imported snippets data
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        filters: { 'JSON Files': ['json'] }
      });
      
      if (uri && uri[0]) {
        const importedData = await this.exportService.importFromJSON(uri[0].fsPath);
        // Save imported snippets
        // Note: In a real implementation, you'd need to handle this properly
      }
    }
    
    return result;
  }
  
  // ==================== Helper Methods ====================
  
  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('StorageManager not initialized. Call initialize() first.');
    }
  }
  
  /**
   * Extract tags from code and explanation
   */
  private extractTags(code: string, explanation: string, language?: string): string[] {
    const tags = new Set<string>();
    
    // Add language as tag
    if (language) {
      tags.add(language);
    }
    
    // Common programming concepts
    const concepts = [
      'async', 'promise', 'callback', 'closure', 'recursion',
      'loop', 'array', 'object', 'function', 'class',
      'inheritance', 'polymorphism', 'encapsulation',
      'algorithm', 'data-structure', 'pattern', 'api',
      'error-handling', 'debugging', 'performance'
    ];
    
    const text = (code + ' ' + explanation).toLowerCase();
    
    for (const concept of concepts) {
      if (text.includes(concept)) {
        tags.add(concept);
      }
    }
    
    return Array.from(tags);
  }
  
  /**
   * Extract key points from explanation
   */
  private extractKeyPoints(explanation: string): string[] {
    const points: string[] = [];
    
    // Simple extraction: look for bullet points or numbered lists
    const lines = explanation.split('\n');
    for (const line of lines) {
      if (line.match(/^[\-\*\•]\s+/) || line.match(/^\d+\.\s+/)) {
        points.push(line.replace(/^[\-\*\•\d\.]\s+/, '').trim());
      }
    }
    
    return points.slice(0, 5); // Limit to 5 key points
  }
  
  /**
   * Assess difficulty based on code complexity
   */
  private assessDifficulty(code: string, explanation: string): 'easy' | 'medium' | 'hard' {
    const lines = code.split('\n').length;
    const hasAsync = /async|await|promise|then/i.test(code);
    const hasRecursion = code.includes('return') && code.match(/function\s+(\w+)/) && 
                          new RegExp(`\\b${code.match(/function\s+(\w+)/)?.[1]}\\s*\\(`).test(code);
    const hasComplexLogic = /if.*else if.*else|switch.*case.*case/i.test(code);
    
    let score = 0;
    
    if (lines > 50) score += 2;
    else if (lines > 20) score += 1;
    
    if (hasAsync) score += 1;
    if (hasRecursion) score += 2;
    if (hasComplexLogic) score += 1;
    
    if (score >= 3) return 'hard';
    if (score >= 1) return 'medium';
    return 'easy';
  }
  
  /**
   * Categorize snippet based on content
   */
  private categorizeSnippet(code: string, explanation: string): string {
    const text = (code + ' ' + explanation).toLowerCase();
    
    if (text.includes('bug') || text.includes('fix') || text.includes('error')) {
      return 'bug-fix';
    }
    if (text.includes('pattern') || text.includes('design')) {
      return 'pattern';
    }
    if (text.includes('algorithm') || text.includes('sort') || text.includes('search')) {
      return 'algorithm';
    }
    if (text.includes('api') || text.includes('request') || text.includes('response')) {
      return 'api';
    }
    
    return 'general';
  }
  
  /**
   * Calculate SuperMemo2 algorithm
   */
  private calculateSM2(
    quality: ReviewQuality,
    previousInterval: number,
    previousEaseFactor: number,
    repetitions: number
  ): SM2Result {
    let interval: number;
    let easeFactor = previousEaseFactor;
    
    // Update ease factor
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easeFactor = Math.max(1.3, easeFactor);
    
    // Calculate interval
    if (quality < ReviewQuality.Correct_Hard) {
      // Failed review - reset
      interval = 1;
    } else {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(previousInterval * easeFactor);
      }
    }
    
    return {
      interval,
      repetition: quality >= ReviewQuality.Correct_Hard ? repetitions + 1 : 0,
      easeFactor
    };
  }
  
  /**
   * Add days to date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  
  /**
   * Prompt for user note
   */
  private async promptForNote(snippetId: string): Promise<void> {
    const note = await vscode.window.showInputBox({
      prompt: 'Add a note for this snippet',
      placeHolder: 'Enter your thoughts or additional context...'
    });
    
    if (note) {
      await this.adapter.updateSnippet(snippetId, { userNotes: note });
    }
  }
}