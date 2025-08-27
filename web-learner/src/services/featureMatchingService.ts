import type { SectionLink, LearningPath } from '@/types';
import { getPythonLearningPath, getJavaScriptLearningPath } from '@/lib/learningPaths';

interface ASTFeatures {
  syntaxFlags: string[];
  patterns: string[];
  apiSignatures: string[];
  complexity: 'low' | 'medium' | 'high';
  contextHints?: Record<string, boolean>;
}

interface FeatureMapping {
  sectionId: string;
  title: string;
  chapterId: string;
  chapterTitle: string;
  language: 'javascript' | 'python';
  patterns?: string[];
  apis?: string[];
  syntax?: string[];
  keywords?: string[];
}

/**
 * Feature-based matching service that uses AST features to find relevant knowledge sections
 */
export class FeatureMatchingService {
  private patternIndex = new Map<string, Set<string>>();
  private apiIndex = new Map<string, Set<string>>();
  private syntaxIndex = new Map<string, Set<string>>();
  private sectionMappings = new Map<string, FeatureMapping>();
  private initialized = false;
  private currentLanguage: 'javascript' | 'python' | null = null;

  /**
   * Initialize the service with feature mappings for a specific language
   */
  async initialize(language: 'javascript' | 'python'): Promise<void> {
    // Skip if already initialized for this language
    if (this.initialized && this.currentLanguage === language) {
      return;
    }

    console.log(`Initializing feature matching service for ${language}`);
    
    // Clear existing indexes
    this.clearIndexes();
    
    // Load learning path
    const learningPath = language === 'python' 
      ? await getPythonLearningPath()
      : await getJavaScriptLearningPath();
    
    // Build feature mappings
    this.buildFeatureMappings(learningPath);
    
    // Build indexes
    this.buildIndexes();
    
    this.initialized = true;
    this.currentLanguage = language;
    
    console.log(`Feature matching service initialized with ${this.sectionMappings.size} sections`);
  }

  /**
   * Build feature mappings for each section
   */
  private buildFeatureMappings(learningPath: LearningPath): void {
    for (const chapter of learningPath.chapters) {
      for (const section of chapter.sections) {
        const mapping: FeatureMapping = {
          sectionId: section.id,
          title: section.title,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          language: learningPath.language,
          ...this.extractFeaturesFromSection(section, learningPath.language)
        };
        
        this.sectionMappings.set(section.id, mapping);
      }
    }
  }

  /**
   * Extract features from section based on title and content
   * This is where we map sections to their relevant code patterns, APIs, and syntax
   */
  private extractFeaturesFromSection(section: { id: string; title: string; chapterId: string }, language: 'javascript' | 'python'): Partial<FeatureMapping> {
    const features: Partial<FeatureMapping> = {
      patterns: [],
      apis: [],
      syntax: [],
      keywords: []
    };

    const title = section.title.toLowerCase();
    const id = section.id.toLowerCase();

    if (language === 'javascript') {
      // Async patterns
      if (title.includes('async') || title.includes('异步') || id.includes('async')) {
        features.patterns = ['async-await', 'promise-chain', 'callback'];
        features.apis = ['fetch', 'Promise', 'async', 'await', 'then', 'catch'];
        features.syntax = ['async', 'promise'];
        features.keywords = ['异步', '异步编程', 'Promise', 'async/await'];
      }
      
      // Array methods
      else if (title.includes('数组') || title.includes('array') || id.includes('array')) {
        features.patterns = ['array-methods'];
        features.apis = ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every', 'includes'];
        features.syntax = ['arrowfunction'];
        features.keywords = ['数组', '数组方法', '遍历', 'Array'];
      }
      
      // Object and destructuring
      else if (title.includes('对象') || title.includes('object') || title.includes('解构')) {
        features.patterns = ['object-destructuring', 'array-destructuring'];
        features.apis = ['Object.keys', 'Object.values', 'Object.entries', 'Object.assign'];
        features.syntax = ['destructuring', 'spread'];
        features.keywords = ['对象', '解构', '展开运算符'];
      }
      
      // Classes and OOP
      else if (title.includes('类') || title.includes('class') || title.includes('面向对象')) {
        features.patterns = ['class-definition', 'inheritance'];
        features.syntax = ['classsyntax'];
        features.keywords = ['类', 'class', '继承', '面向对象'];
      }
      
      // Functions
      else if (title.includes('函数') || title.includes('function')) {
        features.patterns = ['higher-order-function', 'currying', 'composition'];
        features.syntax = ['arrowfunction', 'function'];
        features.keywords = ['函数', 'function', '箭头函数', '高阶函数'];
      }
      
      // Error handling
      else if (title.includes('错误') || title.includes('error') || title.includes('异常')) {
        features.patterns = ['error-handling', 'try-catch'];
        features.syntax = ['trycatch'];
        features.keywords = ['错误处理', '异常', 'try/catch'];
      }
      
      // DOM manipulation
      else if (title.includes('dom') || id.includes('dom')) {
        features.apis = ['document', 'querySelector', 'getElementById', 'addEventListener', 'createElement'];
        features.keywords = ['DOM', 'DOM操作', '事件'];
      }
      
      // Events
      else if (title.includes('事件') || title.includes('event')) {
        features.apis = ['addEventListener', 'removeEventListener', 'dispatchEvent'];
        features.patterns = ['event-handling'];
        features.keywords = ['事件', '事件处理', 'Event'];
      }
      
      // Loops
      else if (title.includes('循环') || title.includes('loop') || title.includes('迭代')) {
        features.patterns = ['loop-pattern'];
        features.keywords = ['循环', 'for', 'while', '遍历'];
      }
      
      // Conditionals
      else if (title.includes('条件') || title.includes('conditional') || title.includes('分支')) {
        features.patterns = ['conditional-rendering'];
        features.keywords = ['条件', 'if/else', '条件语句'];
      }
      
      // Variables and data types
      else if (title.includes('变量') || title.includes('variable') || title.includes('数据类型') || 
               id.includes('variable')) {
        features.apis = ['let', 'const', 'var', 'typeof'];
        features.syntax = ['variable'];
        features.keywords = ['变量', '数据类型', 'let', 'const'];
      }
      
      // ES6 features - includes array methods
      else if ((title.includes('es6') || title.includes('ES6')) && title.includes('特性')) {
        features.patterns = ['array-methods', 'object-destructuring', 'array-destructuring'];
        features.apis = ['map', 'filter', 'reduce', 'forEach', 'find', 'includes'];
        features.syntax = ['arrowfunction', 'destructuring', 'spread'];
        features.keywords = ['ES6', '特性', '数组方法', '解构', '箭头函数'];
      }
    } 
    else if (language === 'python') {
      // Python async
      if (title.includes('async') || title.includes('异步') || title.includes('协程')) {
        features.patterns = ['async-await'];
        features.apis = ['asyncio', 'await', 'async'];
        features.syntax = ['async'];
        features.keywords = ['异步', '协程', 'asyncio'];
      }
      
      // List comprehension
      else if (title.includes('推导') || title.includes('comprehension')) {
        features.patterns = ['list-comprehension'];
        features.syntax = ['listcomp'];
        features.keywords = ['列表推导', '推导式'];
      }
      
      // Decorators
      else if (title.includes('装饰器') || title.includes('decorator')) {
        features.patterns = ['decorator-pattern'];
        features.syntax = ['decorator'];
        features.keywords = ['装饰器', 'decorator'];
      }
      
      // Generators
      else if (title.includes('生成器') || title.includes('generator') || title.includes('迭代器')) {
        features.patterns = ['generator-pattern'];
        features.syntax = ['pythongenerator'];
        features.apis = ['yield', 'next'];
        features.keywords = ['生成器', '迭代器', 'yield'];
      }
      
      // Context managers
      else if (title.includes('上下文') || title.includes('context')) {
        features.patterns = ['context-manager'];
        features.syntax = ['contextmanager'];
        features.apis = ['with', 'open'];
        features.keywords = ['上下文管理器', 'with'];
      }
      
      // Error handling
      else if (title.includes('异常') || title.includes('exception') || title.includes('错误')) {
        features.patterns = ['error-handling'];
        features.syntax = ['trycatch'];
        features.keywords = ['异常处理', 'try/except'];
      }
      
      // Data types
      else if (title.includes('数据类型') || title.includes('type')) {
        features.apis = ['type', 'isinstance', 'int', 'str', 'float', 'list', 'dict'];
        features.keywords = ['数据类型', '类型'];
      }
      
      // Functions
      else if (title.includes('函数') || title.includes('function')) {
        features.apis = ['def', 'lambda', 'return'];
        features.syntax = ['lambda'];
        features.keywords = ['函数', 'lambda', '函数定义'];
      }
      
      // Classes
      else if (title.includes('类') || title.includes('class') || title.includes('面向对象')) {
        features.patterns = ['class-definition', 'inheritance'];
        features.apis = ['class', 'self', 'super', '__init__'];
        features.keywords = ['类', '面向对象', '继承'];
      }
    }

    return features;
  }

  /**
   * Build reverse indexes for fast lookup
   */
  private buildIndexes(): void {
    for (const [sectionId, mapping] of this.sectionMappings.entries()) {
      // Build pattern index
      if (mapping.patterns) {
        for (const pattern of mapping.patterns) {
          if (!this.patternIndex.has(pattern)) {
            this.patternIndex.set(pattern, new Set());
          }
          this.patternIndex.get(pattern)!.add(sectionId);
        }
      }
      
      // Build API index
      if (mapping.apis) {
        for (const api of mapping.apis) {
          const normalizedApi = this.normalizeApiCall(api);
          if (!this.apiIndex.has(normalizedApi)) {
            this.apiIndex.set(normalizedApi, new Set());
          }
          this.apiIndex.get(normalizedApi)!.add(sectionId);
        }
      }
      
      // Build syntax index
      if (mapping.syntax) {
        for (const syntax of mapping.syntax) {
          if (!this.syntaxIndex.has(syntax)) {
            this.syntaxIndex.set(syntax, new Set());
          }
          this.syntaxIndex.get(syntax)!.add(sectionId);
        }
      }
    }
    
    console.log('Indexes built:', {
      patterns: this.patternIndex.size,
      apis: this.apiIndex.size,
      syntax: this.syntaxIndex.size
    });
  }

  /**
   * Normalize API call for matching
   */
  private normalizeApiCall(api: string): string {
    // Remove object prefix for methods (e.g., "Array.map" -> "map")
    const parts = api.split('.');
    return parts[parts.length - 1].toLowerCase();
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
    
    const scores = new Map<string, number>();
    const matchDetails = new Map<string, Set<string>>();
    
    // Weight configuration
    const weights = {
      pattern: 0.4,
      api: 0.3,
      syntax: 0.2,
      complexity: 0.1
    };
    
    // 1. Pattern matching (highest weight - most specific)
    for (const pattern of features.patterns) {
      const sections = this.patternIndex.get(pattern);
      if (sections) {
        for (const sectionId of sections) {
          scores.set(sectionId, (scores.get(sectionId) || 0) + weights.pattern);
          
          if (!matchDetails.has(sectionId)) {
            matchDetails.set(sectionId, new Set());
          }
          matchDetails.get(sectionId)!.add(`pattern:${pattern}`);
        }
      }
    }
    
    // 2. API matching (second highest weight - very specific)
    for (const api of features.apiSignatures) {
      const normalizedApi = this.normalizeApiCall(api);
      const sections = this.apiIndex.get(normalizedApi);
      if (sections) {
        for (const sectionId of sections) {
          scores.set(sectionId, (scores.get(sectionId) || 0) + weights.api);
          
          if (!matchDetails.has(sectionId)) {
            matchDetails.set(sectionId, new Set());
          }
          matchDetails.get(sectionId)!.add(`api:${normalizedApi}`);
        }
      }
    }
    
    // 3. Syntax matching (lower weight - more general)
    for (const syntax of features.syntaxFlags) {
      const sections = this.syntaxIndex.get(syntax);
      if (sections) {
        for (const sectionId of sections) {
          scores.set(sectionId, (scores.get(sectionId) || 0) + weights.syntax);
          
          if (!matchDetails.has(sectionId)) {
            matchDetails.set(sectionId, new Set());
          }
          matchDetails.get(sectionId)!.add(`syntax:${syntax}`);
        }
      }
    }
    
    // 4. Complexity adjustment (small bonus for matching complexity)
    // Give a small bonus to advanced topics for complex code
    if (features.complexity === 'high') {
      for (const [sectionId, mapping] of this.sectionMappings.entries()) {
        if (mapping.title.includes('高级') || mapping.title.includes('advanced') ||
            mapping.title.includes('优化') || mapping.title.includes('性能')) {
          scores.set(sectionId, (scores.get(sectionId) || 0) + weights.complexity);
        }
      }
    }
    
    // Convert scores to SectionLink format and sort
    const results = Array.from(scores.entries())
      .map(([sectionId, score]) => {
        const mapping = this.sectionMappings.get(sectionId)!;
        const details = matchDetails.get(sectionId);
        
        return {
          sectionId,
          title: mapping.title,
          chapterId: mapping.chapterId,
          chapterTitle: mapping.chapterTitle,
          language: mapping.language,
          relevanceScore: score,
          fusedScore: score,
          matchType: 'hybrid' as const,
          confidence: this.calculateConfidence(score),
          matchedKeywords: details ? Array.from(details) : [],
          explanation: this.generateExplanation(details, score)
        };
      })
      .sort((a, b) => b.fusedScore - a.fusedScore)
      .slice(0, topK);
    
    console.log(`Matched ${results.length} sections with feature-based matching`);
    
    return results;
  }

  /**
   * Calculate confidence level based on score
   */
  private calculateConfidence(score: number): 'low' | 'medium' | 'high' {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Generate explanation for the match
   */
  private generateExplanation(details: Set<string> | undefined, score: number): string {
    if (!details || details.size === 0) {
      return '基于代码特征的智能匹配';
    }
    
    const patterns = Array.from(details)
      .filter(d => d.startsWith('pattern:'))
      .map(d => d.replace('pattern:', ''));
    
    const apis = Array.from(details)
      .filter(d => d.startsWith('api:'))
      .map(d => d.replace('api:', ''));
    
    const syntax = Array.from(details)
      .filter(d => d.startsWith('syntax:'))
      .map(d => d.replace('syntax:', ''));
    
    const parts = [];
    if (patterns.length > 0) {
      parts.push(`代码模式: ${patterns.join(', ')}`);
    }
    if (apis.length > 0) {
      parts.push(`API调用: ${apis.join(', ')}`);
    }
    if (syntax.length > 0) {
      parts.push(`语法特征: ${syntax.join(', ')}`);
    }
    
    return `匹配原因: ${parts.join('; ')} (置信度: ${Math.round(score * 100)}%)`;
  }

  /**
   * Clear all indexes
   */
  private clearIndexes(): void {
    this.patternIndex.clear();
    this.apiIndex.clear();
    this.syntaxIndex.clear();
    this.sectionMappings.clear();
  }
}