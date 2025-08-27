/**
 * Knowledge Metadata Types
 * 
 * Defines the structure of knowledge point metadata for matching
 */

/**
 * Knowledge point metadata
 */
export interface KnowledgeMetadata {
  id: string;                      // Unique identifier (e.g., js-sec-1-1-1)
  title: string;                    // Display title
  chapterTitle: string;             // Chapter title for context
  chapterId: string;                // Chapter identifier
  language: 'javascript' | 'python'; // Programming language
  
  // Tags for matching
  metadata: {
    syntax: string[];               // Syntax tags: ['let', 'const', 'arrow-function']
    patterns: string[];             // Pattern tags: ['promise-chain', 'callback']
    apis: string[];                 // API tags: ['Array.map', 'Promise.all']
    concepts: string[];             // Concept tags: ['closure', 'hoisting']
    
    // Learning metadata
    difficulty: 'basic' | 'intermediate' | 'advanced';
    dependencies: string[];         // Prerequisite knowledge point IDs
    related: string[];              // Related knowledge point IDs
    
    // Optional metadata
    keywords?: string[];            // Additional keywords for search
    examples?: number;              // Number of examples in content
    exercises?: number;             // Number of exercises
    estimatedTime?: number;         // Estimated learning time in minutes
  };
  
  // Content location
  contentPath?: string;             // Path to content file
  contentType?: 'markdown' | 'html' | 'json';
  
  // Tracking
  createdAt?: Date;
  updatedAt?: Date;
  version?: string;
}

/**
 * Metadata index for fast lookup
 */
export interface MetadataIndex {
  byId: Map<string, KnowledgeMetadata>;
  bySyntax: Map<string, Set<string>>;      // syntax tag -> knowledge IDs
  byPattern: Map<string, Set<string>>;     // pattern tag -> knowledge IDs
  byApi: Map<string, Set<string>>;         // API tag -> knowledge IDs
  byConcept: Map<string, Set<string>>;     // concept tag -> knowledge IDs
  byLanguage: Map<string, Set<string>>;    // language -> knowledge IDs
  byDifficulty: Map<string, Set<string>>;  // difficulty -> knowledge IDs
}

/**
 * Matching result with similarity score
 */
export interface MatchResult {
  metadata: KnowledgeMetadata;
  score: number;                    // Similarity score (0-1)
  matchedTags: {
    syntax: string[];
    patterns: string[];
    apis: string[];
    concepts: string[];
  };
  confidence: 'low' | 'medium' | 'high';
  explanation?: string;              // Human-readable explanation of match
}

/**
 * Matching configuration
 */
export interface MatchingConfig {
  weights: {
    syntax: number;                  // Weight for syntax matching (e.g., 0.3)
    patterns: number;                // Weight for pattern matching (e.g., 0.35)
    apis: number;                    // Weight for API matching (e.g., 0.25)
    concepts: number;                // Weight for concept matching (e.g., 0.1)
  };
  minScore: number;                  // Minimum score to include in results
  maxResults: number;                // Maximum number of results to return
  includeDependencies: boolean;      // Include dependent knowledge points
  includeRelated: boolean;          // Include related knowledge points
}

/**
 * Default matching configuration
 */
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  weights: {
    syntax: 0.25,
    patterns: 0.35,
    apis: 0.30,
    concepts: 0.10
  },
  minScore: 0.3,
  maxResults: 5,
  includeDependencies: true,
  includeRelated: false
};

/**
 * Metadata validation schema
 */
export interface MetadataValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Batch import result
 */
export interface MetadataImportResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Tag statistics for analytics
 */
export interface TagStatistics {
  syntax: Map<string, number>;      // Tag -> usage count
  patterns: Map<string, number>;
  apis: Map<string, number>;
  concepts: Map<string, number>;
  totalKnowledgePoints: number;
  averageTagsPerPoint: number;
  coverageByDifficulty: {
    basic: number;
    intermediate: number;
    advanced: number;
  };
}