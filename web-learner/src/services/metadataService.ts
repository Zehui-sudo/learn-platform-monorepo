/**
 * Metadata Service
 * 
 * Manages knowledge point metadata for matching
 */

import {
  KnowledgeMetadata,
  MetadataIndex,
  MatchResult,
  MatchingConfig,
  DEFAULT_MATCHING_CONFIG,
  MetadataValidation,
  MetadataImportResult,
  TagStatistics
} from '@/types/metadata';
import { LearningPath } from '@/types';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

export class MetadataService {
  private static instance: MetadataService;
  private index: MetadataIndex;
  private initialized: boolean = false;
  private metadataCache: Map<string, KnowledgeMetadata> = new Map();
  
  private constructor() {
    this.index = {
      byId: new Map(),
      bySyntax: new Map(),
      byPattern: new Map(),
      byApi: new Map(),
      byConcept: new Map(),
      byLanguage: new Map(),
      byDifficulty: new Map()
    };
  }

  public static getInstance(): MetadataService {
    if (!MetadataService.instance) {
      MetadataService.instance = new MetadataService();
    }
    return MetadataService.instance;
  }

  /**
   * Initialize the service with metadata
   */
  async initialize(metadataDir?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing metadata service...');
    
    // Clear existing indexes
    this.clearIndexes();
    
    // Load metadata from files or use hardcoded data for now
    if (metadataDir) {
      await this.loadMetadataFromDirectory(metadataDir);
    } else {
      // Load hardcoded metadata for testing
      this.loadHardcodedMetadata();
    }
    
    // Build indexes
    this.buildIndexes();
    
    this.initialized = true;
    console.log(`Metadata service initialized with ${this.metadataCache.size} knowledge points`);
  }

  /**
   * Load metadata from directory
   */
  private async loadMetadataFromDirectory(dir: string): Promise<void> {
    try {
      const files = await fs.readdir(dir);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
      
      for (const file of yamlFiles) {
        try {
          const content = await fs.readFile(path.join(dir, file), 'utf-8');
          const metadata = yaml.load(content) as KnowledgeMetadata;
          
          const validation = this.validateMetadata(metadata);
          if (validation.isValid) {
            this.metadataCache.set(metadata.id, metadata);
          } else {
            console.warn(`Invalid metadata in ${file}:`, validation.errors);
          }
        } catch (error) {
          console.error(`Failed to load metadata from ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load metadata directory:', error);
    }
  }

  /**
   * Load hardcoded metadata for testing
   */
  private loadHardcodedMetadata(): void {
    const testMetadata: KnowledgeMetadata[] = [
      {
        id: 'js-sec-1-1-1',
        title: '变量声明（var/let/const）',
        chapterTitle: '基础语法与逻辑构建',
        chapterId: 'js-ch-1',
        language: 'javascript',
        metadata: {
          syntax: ['var', 'let', 'const'],
          patterns: [],
          apis: [],
          concepts: ['scope', 'hoisting'],
          difficulty: 'basic',
          dependencies: [],
          related: ['js-sec-1-1-5'],
          keywords: ['变量', '声明', 'variable', 'declaration']
        }
      },
      {
        id: 'js-sec-3-5',
        title: 'async/await',
        chapterTitle: '异步编程与数据获取',
        chapterId: 'js-ch-3',
        language: 'javascript',
        metadata: {
          syntax: ['async', 'await'],
          patterns: ['async-await', 'error-handling'],
          apis: ['Promise'],
          concepts: ['event-loop', 'async-control-flow'],
          difficulty: 'intermediate',
          dependencies: ['js-sec-3-3'],
          related: ['js-sec-3-3', 'js-sec-3-4'],
          keywords: ['异步', 'async', 'await', 'Promise']
        }
      },
      {
        id: 'js-sec-2-1-4',
        title: '数组转换方法（map/filter/reduce）',
        chapterTitle: '复合数据类型',
        chapterId: 'js-ch-2',
        language: 'javascript',
        metadata: {
          syntax: ['arrow-function'],
          patterns: ['array-methods', 'higher-order-function'],
          apis: ['Array.map', 'Array.filter', 'Array.reduce'],
          concepts: ['immutability', 'pure-function'],
          difficulty: 'intermediate',
          dependencies: ['js-sec-2-1-1'],
          related: ['js-sec-3-1-1'],
          keywords: ['数组', '方法', 'map', 'filter', 'reduce', 'Array']
        }
      },
      {
        id: 'js-sec-3-2',
        title: '回调函数',
        chapterTitle: '异步编程与数据获取',
        chapterId: 'js-ch-3',
        language: 'javascript',
        metadata: {
          syntax: ['arrow-function', 'function'],
          patterns: ['callback'],
          apis: [],
          concepts: ['async-control-flow', 'callback-hell'],
          difficulty: 'basic',
          dependencies: ['js-sec-1-4-1'],
          related: ['js-sec-3-3'],
          keywords: ['回调', 'callback', '异步']
        }
      },
      {
        id: 'js-sec-3-3',
        title: 'Promise入门',
        chapterTitle: '异步编程与数据获取',
        chapterId: 'js-ch-3',
        language: 'javascript',
        metadata: {
          syntax: [],
          patterns: ['promise-chain'],
          apis: ['Promise', 'Promise.then', 'Promise.catch'],
          concepts: ['event-loop', 'async-control-flow'],
          difficulty: 'intermediate',
          dependencies: ['js-sec-3-2'],
          related: ['js-sec-3-4', 'js-sec-3-5'],
          keywords: ['Promise', '承诺', '异步']
        }
      }
    ];

    // Add to cache
    for (const metadata of testMetadata) {
      this.metadataCache.set(metadata.id, metadata);
    }
  }

  /**
   * Build indexes for fast lookup
   */
  private buildIndexes(): void {
    for (const metadata of this.metadataCache.values()) {
      // Add to ID index
      this.index.byId.set(metadata.id, metadata);
      
      // Add to language index
      if (!this.index.byLanguage.has(metadata.language)) {
        this.index.byLanguage.set(metadata.language, new Set());
      }
      this.index.byLanguage.get(metadata.language)!.add(metadata.id);
      
      // Add to difficulty index
      if (!this.index.byDifficulty.has(metadata.metadata.difficulty)) {
        this.index.byDifficulty.set(metadata.metadata.difficulty, new Set());
      }
      this.index.byDifficulty.get(metadata.metadata.difficulty)!.add(metadata.id);
      
      // Add to syntax index
      for (const tag of metadata.metadata.syntax) {
        if (!this.index.bySyntax.has(tag)) {
          this.index.bySyntax.set(tag, new Set());
        }
        this.index.bySyntax.get(tag)!.add(metadata.id);
      }
      
      // Add to pattern index
      for (const tag of metadata.metadata.patterns) {
        if (!this.index.byPattern.has(tag)) {
          this.index.byPattern.set(tag, new Set());
        }
        this.index.byPattern.get(tag)!.add(metadata.id);
      }
      
      // Add to API index
      for (const tag of metadata.metadata.apis) {
        if (!this.index.byApi.has(tag)) {
          this.index.byApi.set(tag, new Set());
        }
        this.index.byApi.get(tag)!.add(metadata.id);
      }
      
      // Add to concept index
      for (const tag of metadata.metadata.concepts) {
        if (!this.index.byConcept.has(tag)) {
          this.index.byConcept.set(tag, new Set());
        }
        this.index.byConcept.get(tag)!.add(metadata.id);
      }
    }
    
    console.log('Indexes built:', {
      syntax: this.index.bySyntax.size,
      patterns: this.index.byPattern.size,
      apis: this.index.byApi.size,
      concepts: this.index.byConcept.size
    });
  }

  /**
   * Clear all indexes
   */
  private clearIndexes(): void {
    this.index.byId.clear();
    this.index.bySyntax.clear();
    this.index.byPattern.clear();
    this.index.byApi.clear();
    this.index.byConcept.clear();
    this.index.byLanguage.clear();
    this.index.byDifficulty.clear();
    this.metadataCache.clear();
  }

  /**
   * Match knowledge points based on AST features
   */
  async matchByFeatures(
    features: {
      syntax: string[];
      patterns: string[];
      apis: string[];
      concepts: string[];
    },
    language: 'javascript' | 'python',
    config: MatchingConfig = DEFAULT_MATCHING_CONFIG
  ): Promise<MatchResult[]> {
    // Ensure service is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    const results: MatchResult[] = [];
    const languageKnowledgeIds = this.index.byLanguage.get(language) || new Set();
    
    // Calculate similarity for each knowledge point
    for (const knowledgeId of languageKnowledgeIds) {
      const metadata = this.index.byId.get(knowledgeId);
      if (!metadata) continue;
      
      // Calculate Jaccard similarity for each tag type
      const syntaxScore = this.calculateJaccardSimilarity(
        features.syntax,
        metadata.metadata.syntax
      );
      
      const patternScore = this.calculateJaccardSimilarity(
        features.patterns,
        metadata.metadata.patterns
      );
      
      const apiScore = this.calculateJaccardSimilarity(
        features.apis,
        metadata.metadata.apis
      );
      
      const conceptScore = this.calculateJaccardSimilarity(
        features.concepts,
        metadata.metadata.concepts
      );
      
      // Calculate weighted score
      const totalScore = 
        syntaxScore * config.weights.syntax +
        patternScore * config.weights.patterns +
        apiScore * config.weights.apis +
        conceptScore * config.weights.concepts;
      
      // Skip if below minimum score
      if (totalScore < config.minScore) continue;
      
      // Collect matched tags
      const matchedTags = {
        syntax: features.syntax.filter(t => metadata.metadata.syntax.includes(t)),
        patterns: features.patterns.filter(t => metadata.metadata.patterns.includes(t)),
        apis: features.apis.filter(t => metadata.metadata.apis.includes(t)),
        concepts: features.concepts.filter(t => metadata.metadata.concepts.includes(t))
      };
      
      // Determine confidence level
      let confidence: 'low' | 'medium' | 'high' = 'low';
      if (totalScore >= 0.7) confidence = 'high';
      else if (totalScore >= 0.4) confidence = 'medium';
      
      // Generate explanation
      const explanation = this.generateMatchExplanation(matchedTags, metadata);
      
      results.push({
        metadata,
        score: totalScore,
        matchedTags,
        confidence,
        explanation
      });
    }
    
    // Sort by score and limit results
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, config.maxResults);
    
    // Add dependencies if requested
    if (config.includeDependencies && topResults.length > 0) {
      const dependencyIds = new Set<string>();
      for (const result of topResults) {
        for (const depId of result.metadata.metadata.dependencies) {
          dependencyIds.add(depId);
        }
      }
      
      for (const depId of dependencyIds) {
        const depMetadata = this.index.byId.get(depId);
        if (depMetadata && !topResults.some(r => r.metadata.id === depId)) {
          topResults.push({
            metadata: depMetadata,
            score: 0,
            matchedTags: { syntax: [], patterns: [], apis: [], concepts: [] },
            confidence: 'low',
            explanation: '前置知识'
          });
        }
      }
    }
    
    return topResults;
  }

  /**
   * Calculate Jaccard similarity between two sets
   */
  private calculateJaccardSimilarity(set1: string[], set2: string[]): number {
    if (set1.length === 0 && set2.length === 0) return 0;
    
    const s1 = new Set(set1);
    const s2 = new Set(set2);
    
    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);
    
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Generate human-readable explanation for match
   */
  private generateMatchExplanation(
    matchedTags: {
      syntax: string[];
      patterns: string[];
      apis: string[];
      concepts: string[];
    },
    metadata: KnowledgeMetadata
  ): string {
    const parts: string[] = [];
    
    if (matchedTags.patterns.length > 0) {
      parts.push(`代码模式: ${matchedTags.patterns.join(', ')}`);
    }
    
    if (matchedTags.apis.length > 0) {
      parts.push(`API调用: ${matchedTags.apis.join(', ')}`);
    }
    
    if (matchedTags.syntax.length > 0) {
      parts.push(`语法特征: ${matchedTags.syntax.join(', ')}`);
    }
    
    if (matchedTags.concepts.length > 0) {
      parts.push(`概念: ${matchedTags.concepts.join(', ')}`);
    }
    
    if (parts.length === 0) {
      return '相关知识点';
    }
    
    // Calculate confidence percentage
    const totalMatched = 
      matchedTags.syntax.length + 
      matchedTags.patterns.length + 
      matchedTags.apis.length + 
      matchedTags.concepts.length;
    
    const totalExpected = 
      metadata.metadata.syntax.length + 
      metadata.metadata.patterns.length + 
      metadata.metadata.apis.length + 
      metadata.metadata.concepts.length;
    
    const percentage = totalExpected > 0 
      ? Math.round((totalMatched / totalExpected) * 100) 
      : 0;
    
    return `${parts.join('; ')} (置信度: ${percentage}%)`;
  }

  /**
   * Validate metadata structure
   */
  private validateMetadata(metadata: any): MetadataValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!metadata.id) errors.push('Missing required field: id');
    if (!metadata.title) errors.push('Missing required field: title');
    if (!metadata.language) errors.push('Missing required field: language');
    if (!metadata.metadata) errors.push('Missing required field: metadata');
    
    // Validate metadata structure
    if (metadata.metadata) {
      if (!Array.isArray(metadata.metadata.syntax)) {
        errors.push('metadata.syntax must be an array');
      }
      if (!Array.isArray(metadata.metadata.patterns)) {
        errors.push('metadata.patterns must be an array');
      }
      if (!Array.isArray(metadata.metadata.apis)) {
        errors.push('metadata.apis must be an array');
      }
      if (!Array.isArray(metadata.metadata.concepts)) {
        errors.push('metadata.concepts must be an array');
      }
      
      // Warnings for missing recommended fields
      if (!metadata.metadata.difficulty) {
        warnings.push('Missing recommended field: metadata.difficulty');
      }
      if (!metadata.metadata.dependencies) {
        warnings.push('Missing recommended field: metadata.dependencies');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get metadata by ID
   */
  getMetadataById(id: string): KnowledgeMetadata | undefined {
    return this.index.byId.get(id);
  }

  /**
   * Get all metadata for a language
   */
  getMetadataByLanguage(language: 'javascript' | 'python'): KnowledgeMetadata[] {
    const ids = this.index.byLanguage.get(language) || new Set();
    return Array.from(ids).map(id => this.index.byId.get(id)!).filter(Boolean);
  }

  /**
   * Get tag statistics
   */
  getTagStatistics(): TagStatistics {
    const stats: TagStatistics = {
      syntax: new Map(),
      patterns: new Map(),
      apis: new Map(),
      concepts: new Map(),
      totalKnowledgePoints: this.metadataCache.size,
      averageTagsPerPoint: 0,
      coverageByDifficulty: {
        basic: 0,
        intermediate: 0,
        advanced: 0
      }
    };
    
    // Count tag usage
    for (const [tag, ids] of this.index.bySyntax) {
      stats.syntax.set(tag, ids.size);
    }
    for (const [tag, ids] of this.index.byPattern) {
      stats.patterns.set(tag, ids.size);
    }
    for (const [tag, ids] of this.index.byApi) {
      stats.apis.set(tag, ids.size);
    }
    for (const [tag, ids] of this.index.byConcept) {
      stats.concepts.set(tag, ids.size);
    }
    
    // Count by difficulty
    stats.coverageByDifficulty.basic = this.index.byDifficulty.get('basic')?.size || 0;
    stats.coverageByDifficulty.intermediate = this.index.byDifficulty.get('intermediate')?.size || 0;
    stats.coverageByDifficulty.advanced = this.index.byDifficulty.get('advanced')?.size || 0;
    
    // Calculate average tags per point
    let totalTags = 0;
    for (const metadata of this.metadataCache.values()) {
      totalTags += 
        metadata.metadata.syntax.length +
        metadata.metadata.patterns.length +
        metadata.metadata.apis.length +
        metadata.metadata.concepts.length;
    }
    stats.averageTagsPerPoint = this.metadataCache.size > 0 
      ? totalTags / this.metadataCache.size 
      : 0;
    
    return stats;
  }

  /**
   * Import metadata from array
   */
  async importMetadata(metadataArray: KnowledgeMetadata[]): Promise<MetadataImportResult> {
    const result: MetadataImportResult = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const metadata of metadataArray) {
      const validation = this.validateMetadata(metadata);
      if (validation.isValid) {
        this.metadataCache.set(metadata.id, metadata);
        result.success++;
      } else {
        result.failed++;
        result.errors.push({
          id: metadata.id || 'unknown',
          error: validation.errors.join(', ')
        });
      }
    }
    
    // Rebuild indexes
    this.buildIndexes();
    
    return result;
  }

  /**
   * Export all metadata
   */
  exportMetadata(): KnowledgeMetadata[] {
    return Array.from(this.metadataCache.values());
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}