import type { SectionLink } from '@/types';
import { MetadataService } from './metadataService';
import type { MatchResult, MatchingConfig } from '@/types/metadata';

interface ASTFeatures {
  syntax: string[];        // Changed from syntaxFlags
  patterns: string[];
  apis: string[];          // Changed from apiSignatures
  concepts: string[];      // Added concepts
  complexity: 'low' | 'medium' | 'high';
  contextHints?: Record<string, boolean>;
}

/**
 * Feature-based matching service that uses metadata for finding relevant knowledge sections
 */
export class FeatureMatchingService {
  private metadataService: MetadataService;
  private initialized = false;
  private currentLanguage: 'javascript' | 'python' | null = null;

  constructor() {
    this.metadataService = new MetadataService();
  }

  /**
   * Initialize the service with metadata for a specific language
   */
  async initialize(language: 'javascript' | 'python'): Promise<void> {
    // Skip if already initialized for this language
    if (this.initialized && this.currentLanguage === language) {
      return;
    }

    console.log(`Initializing feature matching service for ${language}`);
    
    // Initialize metadata service
    await this.metadataService.initialize();
    
    this.initialized = true;
    this.currentLanguage = language;
    
    const stats = this.metadataService.getStatistics();
    console.log(`Feature matching service initialized with ${stats.totalKnowledgePoints} knowledge points`);
  }


  /**
   * Match sections based on AST features
   */
  async matchByFeatures(
    features: ASTFeatures, 
    language: 'javascript' | 'python',
    topK: number = 5
  ): Promise<SectionLink[]> {
    // Ensure service is initialized
    await this.initialize(language);
    
    // Use metadata service for matching
    const matchResults = await this.metadataService.matchByFeatures(
      {
        syntax: features.syntax,
        patterns: features.patterns,
        apis: features.apis,
        concepts: features.concepts
      },
      language,
      {
        minScore: 0.3,
        maxResults: topK
      }
    );
    
    // Convert MatchResult to SectionLink format
    const results: SectionLink[] = matchResults.map(result => ({
      sectionId: result.metadata.id,
      title: result.metadata.title,
      chapterId: result.metadata.chapterId,
      chapterTitle: result.metadata.chapterTitle,
      language: result.metadata.language,
      relevanceScore: result.score,
      fusedScore: result.score,
      matchType: 'hybrid' as const,
      confidence: result.confidence,
      matchedKeywords: [
        ...result.matchedTags.syntax.map(t => `语法:${t}`),
        ...result.matchedTags.patterns.map(t => `模式:${t}`),
        ...result.matchedTags.apis.map(t => `API:${t}`),
        ...result.matchedTags.concepts.map(t => `概念:${t}`)
      ],
      explanation: result.explanation || this.generateExplanation(result)
    }));
    
    console.log(`Matched ${results.length} sections with metadata-based matching`);
    
    return results;
  }

  /**
   * Generate explanation for the match
   */
  private generateExplanation(result: MatchResult): string {
    const parts: string[] = [];
    
    if (result.matchedTags.patterns.length > 0) {
      parts.push(`代码模式: ${result.matchedTags.patterns.join(', ')}`);
    }
    if (result.matchedTags.apis.length > 0) {
      parts.push(`API调用: ${result.matchedTags.apis.join(', ')}`);
    }
    if (result.matchedTags.syntax.length > 0) {
      parts.push(`语法特征: ${result.matchedTags.syntax.join(', ')}`);
    }
    if (result.matchedTags.concepts.length > 0) {
      parts.push(`概念: ${result.matchedTags.concepts.join(', ')}`);
    }
    
    if (parts.length === 0) {
      return '基于代码特征的智能匹配';
    }
    
    return `匹配原因: ${parts.join('; ')} (置信度: ${Math.round(result.score * 100)}%)`;
  }
}