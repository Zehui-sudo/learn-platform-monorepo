import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';
import { Logger } from '../../utils/logger';
import { ConfigurationService } from '../config/configurationService';
import type { 
  KnowledgeLinkRequest, 
  KnowledgeLinkResponse, 
  SectionLink,
  CacheEntry,
  KnowledgeLinkConfig 
} from '../../types/knowledge';

/**
 * Knowledge Link API Service
 * Handles communication with the platform for knowledge link recommendations
 */
export class KnowledgeApi {
  private static instance: KnowledgeApi;
  private logger: Logger;
  private config: ConfigurationService;
  private cache: Map<string, CacheEntry<KnowledgeLinkResponse>>;
  private readonly maxCacheSize = 100;
  private pendingRequest: NodeJS.Timeout | null = null;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = ConfigurationService.getInstance();
    this.cache = new Map();
    
    // Clean up expired cache entries every 5 minutes
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }

  public static getInstance(): KnowledgeApi {
    if (!KnowledgeApi.instance) {
      KnowledgeApi.instance = new KnowledgeApi();
    }
    return KnowledgeApi.instance;
  }

  /**
   * Fetch knowledge links with caching and error handling
   */
  public async fetchKnowledgeLinks(
    request: KnowledgeLinkRequest
  ): Promise<KnowledgeLinkResponse> {
    const config = this.getConfig();
    
    // Check if knowledge links are enabled
    if (!config.enabled) {
      this.logger.debug('Knowledge links are disabled');
      return { success: false, data: [], matchingMethod: 'none' };
    }

    // Apply configuration
    request.topK = Math.min(request.topK || 5, config.maxResults);

    // Check cache
    const cacheKey = this.generateCacheKey(request);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached knowledge links');
      return cached;
    }

    try {
      // Fetch with retry logic
      const response = await this.fetchWithRetry(request);
      
      // Filter by confidence if configured
      if (response.success && response.data) {
        response.data = this.filterByConfidence(response.data, config.minConfidence);
      }

      // Cache successful response
      if (response.success && config.cacheEnabled) {
        this.setCache(cacheKey, response);
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to fetch knowledge links:', error);
      
      // Try fallback to keyword matching
      if (request.features && request.code) {
        return this.fetchWithKeywordFallback(request);
      }
      
      return {
        success: false,
        data: [],
        matchingMethod: 'none',
        error: 'Failed to fetch knowledge links',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch with debouncing to avoid rapid repeated requests
   */
  public async fetchKnowledgeLinksDebounced(
    request: KnowledgeLinkRequest,
    delay: number = 300
  ): Promise<KnowledgeLinkResponse> {
    // Cancel pending request
    if (this.pendingRequest) {
      clearTimeout(this.pendingRequest);
    }

    return new Promise((resolve) => {
      this.pendingRequest = setTimeout(async () => {
        const result = await this.fetchKnowledgeLinks(request);
        resolve(result);
        this.pendingRequest = null;
      }, delay);
    });
  }

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry(
    request: KnowledgeLinkRequest,
    maxRetries: number = 3
  ): Promise<KnowledgeLinkResponse> {
    const platformUrl = vscode.workspace.getConfiguration('learnLinker.platform').get('url', 'http://localhost:3000');
    const url = `${platformUrl}/api/links`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.logger.debug(`Fetching knowledge links (attempt ${attempt + 1})`);
        
        const response = await axios.post<KnowledgeLinkResponse>(
          url,
          request,
          {
            timeout: 10000, // 10 second timeout
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Learn-Linker-VSCode'
            }
          }
        );

        if (response.data.success) {
          this.logger.info(`Found ${response.data.data.length} knowledge links`);
          return response.data;
        }

        // Don't retry on client errors
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Client error: ${response.status}`);
        }

      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          
          // Don't retry on client errors
          if (axiosError.response?.status && 
              axiosError.response.status >= 400 && 
              axiosError.response.status < 500) {
            throw error;
          }
          
          // Network or server error - retry if not last attempt
          if (!isLastAttempt) {
            const backoffDelay = Math.pow(2, attempt) * 1000;
            this.logger.warn(`Request failed, retrying in ${backoffDelay}ms...`);
            await this.sleep(backoffDelay);
            continue;
          }
        }
        
        if (isLastAttempt) {
          throw error;
        }
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Fallback to keyword-based matching
   */
  private async fetchWithKeywordFallback(
    request: KnowledgeLinkRequest
  ): Promise<KnowledgeLinkResponse> {
    try {
      this.logger.info('Falling back to keyword-based matching');
      
      // Remove features and retry with just code
      const fallbackRequest = { ...request };
      delete fallbackRequest.features;
      
      const platformUrl = vscode.workspace.getConfiguration('learnLinker.platform').get('url', 'http://localhost:3000');
      const url = `${platformUrl}/api/links`;
      
      const response = await axios.post<KnowledgeLinkResponse>(
        url,
        fallbackRequest,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Learn-Linker-VSCode'
          }
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Keyword fallback also failed:', error);
      return {
        success: false,
        data: [],
        matchingMethod: 'none',
        error: 'Both feature and keyword matching failed'
      };
    }
  }

  /**
   * Filter results by minimum confidence level
   */
  private filterByConfidence(
    links: SectionLink[],
    minConfidence: 'low' | 'medium' | 'high'
  ): SectionLink[] {
    const confidenceLevels = { low: 0, medium: 1, high: 2 };
    const minLevel = confidenceLevels[minConfidence];

    return links.filter(link => {
      if (!link.confidence) return true;
      return confidenceLevels[link.confidence] >= minLevel;
    });
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: KnowledgeLinkRequest): string {
    const key = {
      code: request.code?.substring(0, 100), // First 100 chars
      language: request.language,
      features: request.features ? JSON.stringify(request.features) : '',
      topK: request.topK
    };
    return JSON.stringify(key);
  }

  /**
   * Get from cache if valid
   */
  private getFromCache(key: string): KnowledgeLinkResponse | null {
    const config = this.getConfig();
    if (!config.cacheEnabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    return entry.value;
  }

  /**
   * Set cache with LRU eviction
   */
  private setCache(key: string, value: KnowledgeLinkResponse): void {
    // Implement LRU: Remove least recently used if at capacity
    if (this.cache.size >= this.maxCacheSize) {
      let lruKey: string | null = null;
      let lruTime = Infinity;
      
      for (const [k, v] of this.cache.entries()) {
        const lastUsed = v.timestamp + (v.hits * 60000); // Weight by hits
        if (lastUsed < lruTime) {
          lruTime = lastUsed;
          lruKey = k;
        }
      }
      
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const config = this.getConfig();
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > config.cacheTTL) {
        this.cache.delete(key);
      }
    }
    
    this.logger.debug(`Cache cleanup: ${this.cache.size} entries remaining`);
  }

  /**
   * Clear all cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.logger.info('Knowledge link cache cleared');
  }

  /**
   * Get configuration
   */
  private getConfig(): KnowledgeLinkConfig {
    const workspace = vscode.workspace;
    return {
      enabled: workspace.getConfiguration('learnLinker.knowledgeLinks').get('enabled', true),
      maxResults: workspace.getConfiguration('learnLinker.knowledgeLinks').get('maxResults', 5),
      minConfidence: workspace.getConfiguration('learnLinker.knowledgeLinks').get('minConfidence', 'low') as 'low' | 'medium' | 'high',
      showMatchReason: workspace.getConfiguration('learnLinker.knowledgeLinks').get('showMatchReason', true),
      autoOpen: workspace.getConfiguration('learnLinker.knowledgeLinks').get('autoOpen', false),
      cacheEnabled: workspace.getConfiguration('learnLinker.knowledgeLinks').get('cacheEnabled', true),
      cacheTTL: workspace.getConfiguration('learnLinker.knowledgeLinks').get('cacheTTL', 300000) // 5 minutes
    };
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hits: number; entries: string[] } {
    let totalHits = 0;
    const entries: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      totalHits += entry.hits;
      entries.push(`${key.substring(0, 50)}... (hits: ${entry.hits})`);
    }
    
    return {
      size: this.cache.size,
      hits: totalHits,
      entries
    };
  }
}