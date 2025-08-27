/**
 * Local Storage Adapter - VS Code Extension Storage Implementation
 * 
 * This adapter provides a unified interface for storing and retrieving
 * code snippets using VS Code's ExtensionContext storage APIs.
 */

import * as vscode from 'vscode';
import { 
  CodeSnippet, 
  SnippetCollection, 
  StorageMetadata,
  SearchCriteria,
  BatchOperationResult
} from '../../types/snippet';
import { Logger } from '../../utils/logger';

/**
 * Storage keys used in VS Code's globalState/workspaceState
 */
const STORAGE_KEYS = {
  SNIPPETS: 'learnLinker.snippets',
  COLLECTIONS: 'learnLinker.collections',
  METADATA: 'learnLinker.metadata',
  REVIEW_SCHEDULE: 'learnLinker.reviewSchedule'
};

/**
 * Local storage adapter for managing code snippets
 */
export class LocalStorageAdapter {
  private static instance: LocalStorageAdapter;
  private context: vscode.ExtensionContext | null = null;
  private logger: Logger;
  private useGlobalStorage: boolean = true;
  
  private constructor() {
    this.logger = Logger.getInstance();
  }
  
  public static getInstance(): LocalStorageAdapter {
    if (!LocalStorageAdapter.instance) {
      LocalStorageAdapter.instance = new LocalStorageAdapter();
    }
    return LocalStorageAdapter.instance;
  }
  
  /**
   * Initialize the adapter with VS Code extension context
   */
  public initialize(context: vscode.ExtensionContext, useGlobalStorage: boolean = true): void {
    this.context = context;
    this.useGlobalStorage = useGlobalStorage;
    this.logger.info('LocalStorageAdapter initialized', { 
      storageType: useGlobalStorage ? 'global' : 'workspace' 
    });
  }
  
  /**
   * Get the appropriate storage based on configuration
   */
  private get storage(): vscode.Memento {
    if (!this.context) {
      throw new Error('LocalStorageAdapter not initialized. Call initialize() first.');
    }
    return this.useGlobalStorage ? this.context.globalState : this.context.workspaceState;
  }
  
  // ==================== CRUD Operations ====================
  
  /**
   * Save a new snippet
   */
  public async saveSnippet(snippet: CodeSnippet): Promise<void> {
    try {
      const snippets = await this.getAllSnippetsMap();
      snippets.set(snippet.id, snippet);
      
      await this.storage.update(STORAGE_KEYS.SNIPPETS, Array.from(snippets.entries()));
      await this.updateMetadata(snippets.size);
      
      this.logger.debug('Snippet saved', { id: snippet.id });
    } catch (error) {
      this.logger.error('Failed to save snippet', error);
      throw error;
    }
  }
  
  /**
   * Get a snippet by ID
   */
  public async getSnippet(id: string): Promise<CodeSnippet | undefined> {
    const snippets = await this.getAllSnippetsMap();
    return snippets.get(id);
  }
  
  /**
   * Update an existing snippet
   */
  public async updateSnippet(id: string, updates: Partial<CodeSnippet>): Promise<boolean> {
    try {
      const snippets = await this.getAllSnippetsMap();
      const existing = snippets.get(id);
      
      if (!existing) {
        this.logger.warn('Snippet not found for update', { id });
        return false;
      }
      
      const updated: CodeSnippet = {
        ...existing,
        ...updates,
        id: existing.id, // Ensure ID cannot be changed
        updatedAt: new Date()
      };
      
      snippets.set(id, updated);
      await this.storage.update(STORAGE_KEYS.SNIPPETS, Array.from(snippets.entries()));
      
      this.logger.debug('Snippet updated', { id });
      return true;
    } catch (error) {
      this.logger.error('Failed to update snippet', error);
      throw error;
    }
  }
  
  /**
   * Delete a snippet
   */
  public async deleteSnippet(id: string): Promise<boolean> {
    try {
      const snippets = await this.getAllSnippetsMap();
      const deleted = snippets.delete(id);
      
      if (deleted) {
        await this.storage.update(STORAGE_KEYS.SNIPPETS, Array.from(snippets.entries()));
        await this.updateMetadata(snippets.size);
        this.logger.debug('Snippet deleted', { id });
      }
      
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete snippet', error);
      throw error;
    }
  }
  
  /**
   * Delete multiple snippets
   */
  public async deleteSnippets(ids: string[]): Promise<BatchOperationResult> {
    try {
      const snippets = await this.getAllSnippetsMap();
      let deleted = 0;
      const errors: Array<{ id: string; error: string }> = [];
      
      for (const id of ids) {
        if (snippets.delete(id)) {
          deleted++;
        } else {
          errors.push({ id, error: 'Snippet not found' });
        }
      }
      
      await this.storage.update(STORAGE_KEYS.SNIPPETS, Array.from(snippets.entries()));
      await this.updateMetadata(snippets.size);
      
      return {
        success: deleted > 0,
        processed: deleted,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      this.logger.error('Failed to delete snippets', error);
      throw error;
    }
  }
  
  // ==================== Query Operations ====================
  
  /**
   * Get all snippets
   */
  public async getAllSnippets(): Promise<CodeSnippet[]> {
    const snippets = await this.getAllSnippetsMap();
    return Array.from(snippets.values());
  }
  
  /**
   * Get all snippets as a Map
   */
  private async getAllSnippetsMap(): Promise<Map<string, CodeSnippet>> {
    const stored = this.storage.get<[string, CodeSnippet][]>(STORAGE_KEYS.SNIPPETS, []);
    return new Map(stored);
  }
  
  /**
   * Search snippets based on criteria
   */
  public async searchSnippets(criteria: SearchCriteria): Promise<CodeSnippet[]> {
    let snippets = await this.getAllSnippets();
    
    // Text search
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      snippets = snippets.filter(s => 
        s.code.toLowerCase().includes(query) ||
        s.explanation?.toLowerCase().includes(query) ||
        s.userNotes?.toLowerCase().includes(query) ||
        s.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Language filter
    if (criteria.language) {
      const languages = Array.isArray(criteria.language) ? criteria.language : [criteria.language];
      snippets = snippets.filter(s => languages.includes(s.language));
    }
    
    // Tags filter (AND operation)
    if (criteria.tags && criteria.tags.length > 0) {
      snippets = snippets.filter(s => 
        criteria.tags!.every(tag => s.tags.includes(tag))
      );
    }
    
    // Difficulty filter
    if (criteria.difficulty) {
      snippets = snippets.filter(s => s.difficulty === criteria.difficulty);
    }
    
    // Mastered filter
    if (criteria.mastered !== undefined) {
      snippets = snippets.filter(s => s.mastered === criteria.mastered);
    }
    
    // Needs review filter
    if (criteria.needsReview) {
      const now = new Date();
      snippets = snippets.filter(s => 
        s.nextReviewDate && new Date(s.nextReviewDate) <= now && !s.mastered
      );
    }
    
    // Date range filter
    if (criteria.dateRange) {
      const { from, to } = criteria.dateRange;
      snippets = snippets.filter(s => {
        const createdAt = new Date(s.createdAt);
        if (from && createdAt < from) return false;
        if (to && createdAt > to) return false;
        return true;
      });
    }
    
    // Sorting
    if (criteria.sortBy) {
      snippets.sort((a, b) => {
        let comparison = 0;
        
        switch (criteria.sortBy) {
          case 'date':
            comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            break;
          case 'reviewDate':
            const aReview = a.nextReviewDate ? new Date(a.nextReviewDate).getTime() : 0;
            const bReview = b.nextReviewDate ? new Date(b.nextReviewDate).getTime() : 0;
            comparison = aReview - bReview;
            break;
          case 'difficulty':
            const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
            comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
            break;
          case 'reviewCount':
            comparison = b.reviewCount - a.reviewCount;
            break;
        }
        
        return criteria.sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    // Pagination
    if (criteria.offset !== undefined || criteria.limit !== undefined) {
      const offset = criteria.offset || 0;
      const limit = criteria.limit || snippets.length;
      snippets = snippets.slice(offset, offset + limit);
    }
    
    return snippets;
  }
  
  /**
   * Get snippets due for review
   */
  public async getSnippetsForReview(): Promise<CodeSnippet[]> {
    return this.searchSnippets({ needsReview: true, sortBy: 'reviewDate' });
  }
  
  // ==================== Collection Operations ====================
  
  /**
   * Save a collection
   */
  public async saveCollection(collection: SnippetCollection): Promise<void> {
    try {
      const collections = await this.getAllCollectionsMap();
      collections.set(collection.id, collection);
      
      await this.storage.update(STORAGE_KEYS.COLLECTIONS, Array.from(collections.entries()));
      this.logger.debug('Collection saved', { id: collection.id });
    } catch (error) {
      this.logger.error('Failed to save collection', error);
      throw error;
    }
  }
  
  /**
   * Get all collections
   */
  public async getAllCollections(): Promise<SnippetCollection[]> {
    const collections = await this.getAllCollectionsMap();
    return Array.from(collections.values());
  }
  
  /**
   * Get all collections as a Map
   */
  private async getAllCollectionsMap(): Promise<Map<string, SnippetCollection>> {
    const stored = this.storage.get<[string, SnippetCollection][]>(STORAGE_KEYS.COLLECTIONS, []);
    return new Map(stored);
  }
  
  /**
   * Delete a collection (does not delete snippets)
   */
  public async deleteCollection(id: string): Promise<boolean> {
    try {
      const collections = await this.getAllCollectionsMap();
      const deleted = collections.delete(id);
      
      if (deleted) {
        await this.storage.update(STORAGE_KEYS.COLLECTIONS, Array.from(collections.entries()));
        this.logger.debug('Collection deleted', { id });
      }
      
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete collection', error);
      throw error;
    }
  }
  
  // ==================== Metadata Operations ====================
  
  /**
   * Get storage metadata
   */
  public async getMetadata(): Promise<StorageMetadata> {
    const metadata = this.storage.get<StorageMetadata>(STORAGE_KEYS.METADATA);
    
    if (!metadata) {
      return {
        version: '1.0.0',
        totalSnippets: 0,
        totalCollections: 0,
        lastModified: new Date(),
        storageLocation: this.useGlobalStorage ? 'global' : 'workspace'
      };
    }
    
    return metadata;
  }
  
  /**
   * Update storage metadata
   */
  private async updateMetadata(snippetCount: number): Promise<void> {
    const collections = await this.getAllCollections();
    const metadata: StorageMetadata = {
      version: '1.0.0',
      totalSnippets: snippetCount,
      totalCollections: collections.length,
      lastModified: new Date(),
      storageLocation: this.useGlobalStorage ? 'global' : 'workspace',
      sizeInBytes: await this.estimateStorageSize()
    };
    
    await this.storage.update(STORAGE_KEYS.METADATA, metadata);
  }
  
  /**
   * Estimate storage size in bytes
   */
  private async estimateStorageSize(): Promise<number> {
    const snippets = await this.getAllSnippets();
    const collections = await this.getAllCollections();
    
    const snippetsJson = JSON.stringify(snippets);
    const collectionsJson = JSON.stringify(collections);
    
    // Rough estimate of size in bytes
    return new TextEncoder().encode(snippetsJson + collectionsJson).length;
  }
  
  // ==================== Utility Operations ====================
  
  /**
   * Clear all storage
   */
  public async clearAll(): Promise<void> {
    try {
      await this.storage.update(STORAGE_KEYS.SNIPPETS, undefined);
      await this.storage.update(STORAGE_KEYS.COLLECTIONS, undefined);
      await this.storage.update(STORAGE_KEYS.METADATA, undefined);
      await this.storage.update(STORAGE_KEYS.REVIEW_SCHEDULE, undefined);
      
      this.logger.info('All storage cleared');
    } catch (error) {
      this.logger.error('Failed to clear storage', error);
      throw error;
    }
  }
  
  /**
   * Get storage statistics
   */
  public async getStatistics(): Promise<{
    totalSnippets: number;
    totalCollections: number;
    byLanguage: Record<string, number>;
    byDifficulty: Record<string, number>;
    mastered: number;
    needsReview: number;
    storageSize: number;
  }> {
    const snippets = await this.getAllSnippets();
    const collections = await this.getAllCollections();
    const now = new Date();
    
    const byLanguage: Record<string, number> = {};
    const byDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    let mastered = 0;
    let needsReview = 0;
    
    for (const snippet of snippets) {
      // Language stats
      byLanguage[snippet.language] = (byLanguage[snippet.language] || 0) + 1;
      
      // Difficulty stats
      byDifficulty[snippet.difficulty]++;
      
      // Mastered stats
      if (snippet.mastered) mastered++;
      
      // Review stats
      if (snippet.nextReviewDate && new Date(snippet.nextReviewDate) <= now && !snippet.mastered) {
        needsReview++;
      }
    }
    
    return {
      totalSnippets: snippets.length,
      totalCollections: collections.length,
      byLanguage,
      byDifficulty,
      mastered,
      needsReview,
      storageSize: await this.estimateStorageSize()
    };
  }
}