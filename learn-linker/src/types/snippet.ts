/**
 * Code Snippet Types - Data models for local storage
 * 
 * This module defines the core data structures for storing and managing
 * code learning snippets, collections, and review schedules.
 */

/**
 * Main code snippet structure for learning and review
 */
export interface CodeSnippet {
  // Basic Information
  id: string;                          // Unique identifier (UUID)
  code: string;                        // Code snippet content
  language: string;                    // Programming language
  filePath?: string;                   // Original file path
  fileName?: string;                   // File name
  lineRange?: string;                  // Line range (e.g., "10-25")
  
  // AI Generated Content
  explanation?: string;                // AI-generated explanation
  keyPoints?: string[];                // Key learning points
  complexity?: string;                 // Code complexity analysis
  
  // Learning Metadata
  difficulty: 'easy' | 'medium' | 'hard';  // Difficulty level
  tags: string[];                      // Tags (e.g., 'async', 'closure', 'algorithm')
  category?: string;                   // Category (e.g., 'bug-fix', 'pattern', 'syntax')
  
  // Review Tracking
  reviewCount: number;                 // Number of reviews
  lastReviewDate?: Date;               // Last review date
  nextReviewDate?: Date;               // Next scheduled review (spaced repetition)
  mastered: boolean;                   // Whether the concept is mastered
  easeFactor?: number;                 // SuperMemo2 ease factor (default: 2.5)
  interval?: number;                   // Current interval in days
  
  // User Content
  userNotes?: string;                  // User's personal notes
  relatedConcepts?: string[];          // Related programming concepts
  linkedSnippets?: string[];           // IDs of related snippets
  
  // Timestamps
  createdAt: Date;                     // Creation timestamp
  updatedAt: Date;                     // Last update timestamp
  
  // Source Information
  source?: 'manual' | 'ai-explain' | 'import';  // How the snippet was created
  originalContext?: Record<string, any>;        // Additional context data
}

/**
 * Collection of related snippets
 */
export interface SnippetCollection {
  id: string;                          // Collection ID
  name: string;                        // Collection name (e.g., "JavaScript Closures")
  description?: string;                // Collection description
  snippetIds: string[];                // Array of snippet IDs in this collection
  tags?: string[];                     // Collection-level tags
  isPublic?: boolean;                  // Whether this collection can be shared
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Storage metadata for tracking and versioning
 */
export interface StorageMetadata {
  version: string;                     // Storage schema version
  totalSnippets: number;               // Total number of snippets
  totalCollections: number;            // Total number of collections
  lastModified: Date;                  // Last modification timestamp
  lastSync?: Date;                     // Last sync with platform (if applicable)
  storageLocation: 'global' | 'workspace';  // Where data is stored
  sizeInBytes?: number;                // Approximate storage size
}

/**
 * Review schedule for spaced repetition
 */
export interface ReviewSchedule {
  snippetId: string;                   // Associated snippet ID
  nextReviewDate: Date;                // When to review next
  interval: number;                    // Current interval in days
  easeFactor: number;                  // Ease factor (2.5 default, range: 1.3-2.5)
  repetitions: number;                 // Number of consecutive correct reviews
  lapses: number;                      // Number of times forgotten
}

/**
 * Review quality ratings for SuperMemo2 algorithm
 */
export enum ReviewQuality {
  Complete_Blackout = 0,               // Complete failure to recall
  Incorrect_Hard = 1,                  // Incorrect response, very difficult
  Incorrect_Easy = 2,                  // Incorrect but feels familiar
  Correct_Hard = 3,                    // Correct but difficult to recall
  Correct_Medium = 4,                  // Correct with some hesitation
  Perfect = 5                          // Perfect recall
}

/**
 * Export format options
 */
export interface ExportOptions {
  format: 'json' | 'markdown' | 'html';
  includeExplanations: boolean;
  includeUserNotes: boolean;
  includeMetadata: boolean;
  groupByCategory?: boolean;
  sortBy?: 'date' | 'difficulty' | 'language';
}

/**
 * Import result structure
 */
export interface ImportResult {
  success: boolean;
  imported: number;                    // Number of successfully imported snippets
  skipped: number;                     // Number of skipped (duplicate) snippets
  errors: string[];                    // Error messages if any
  snippetIds: string[];                // IDs of imported snippets
}

/**
 * Search/filter criteria for snippets
 */
export interface SearchCriteria {
  query?: string;                      // Text search in code/explanation
  language?: string | string[];        // Filter by language(s)
  tags?: string[];                     // Filter by tags (AND operation)
  difficulty?: 'easy' | 'medium' | 'hard';
  mastered?: boolean;                  // Filter by mastery status
  needsReview?: boolean;               // Due for review
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  sortBy?: 'date' | 'reviewDate' | 'difficulty' | 'reviewCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;                      // Max results to return
  offset?: number;                     // For pagination
}

/**
 * Statistics for tracking learning progress
 */
export interface LearningStatistics {
  totalSnippets: number;
  masteredSnippets: number;
  pendingReview: number;
  overdueReview: number;
  byLanguage: Record<string, number>;
  byDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  averageReviewCount: number;
  streakDays: number;                 // Consecutive days with reviews
  lastActivityDate?: Date;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}