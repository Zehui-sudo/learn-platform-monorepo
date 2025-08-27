/**
 * Knowledge link related types
 */

export interface SectionLink {
  sectionId: string;
  title: string;
  chapterId: string;
  chapterTitle: string;
  language: 'javascript' | 'python';
  relevanceScore?: number;
  fusedScore?: number;
  matchType?: 'keyword' | 'semantic' | 'hybrid' | 'feature-based';
  confidence?: 'low' | 'medium' | 'high';
  matchedKeywords?: string[];
  explanation?: string;
}

export interface KnowledgeLinkRequest {
  code?: string;
  language: 'javascript' | 'python' | 'typescript';
  features?: {
    syntaxFlags: string[];
    patterns: string[];
    apiSignatures: string[];
    complexity: 'low' | 'medium' | 'high';
    contextHints?: Record<string, boolean>;
  };
  filePath?: string;
  topK?: number;
}

export interface KnowledgeLinkResponse {
  success: boolean;
  data: SectionLink[];
  matchingMethod: 'feature-based' | 'keyword-based' | 'none';
  error?: string;
  details?: string;
}

export interface KnowledgeLinkConfig {
  enabled: boolean;
  maxResults: number;
  minConfidence: 'low' | 'medium' | 'high';
  showMatchReason: boolean;
  autoOpen: boolean;
  cacheEnabled: boolean;
  cacheTTL: number; // in milliseconds
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}