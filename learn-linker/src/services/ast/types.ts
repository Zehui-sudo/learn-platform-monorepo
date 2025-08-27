/**
 * AST Analysis Type Definitions
 * 
 * Defines the structure of code features extracted from AST analysis
 */

export interface CodeFeatures {
  syntax: SyntaxFeatures;
  patterns: CodePattern[];
  apiCalls: APICall[];
  complexity: ComplexityMetrics;
  context: CodeContext;
}

export interface SyntaxFeatures {
  // JavaScript/TypeScript features
  hasAsync?: boolean;
  hasPromise?: boolean;
  hasArrowFunction?: boolean;
  hasDestructuring?: boolean;
  hasSpread?: boolean;
  hasTemplate?: boolean;
  hasClassSyntax?: boolean;
  hasTryCatch?: boolean;
  hasGenerator?: boolean;
  
  // Python features
  hasDecorator?: boolean;
  hasPythonGenerator?: boolean;
  hasListComp?: boolean;
  hasContextManager?: boolean;
  hasTyping?: boolean;
  hasLambda?: boolean;
  hasFString?: boolean;
}

export interface CodePattern {
  type: PatternType;
  confidence: number; // 0-1
  location?: CodeLocation;
  description?: string;
}

export enum PatternType {
  // Async patterns
  ASYNC_AWAIT = 'async-await',
  PROMISE_CHAIN = 'promise-chain',
  CALLBACK = 'callback',
  
  // Error handling
  ERROR_HANDLING = 'error-handling',
  TRY_CATCH = 'try-catch',
  
  // Data manipulation
  ARRAY_METHODS = 'array-methods',
  OBJECT_DESTRUCTURING = 'object-destructuring',
  ARRAY_DESTRUCTURING = 'array-destructuring',
  
  // Control flow
  CONDITIONAL_RENDERING = 'conditional-rendering',
  LOOP_PATTERN = 'loop-pattern',
  RECURSIVE = 'recursive',
  
  // OOP patterns
  CLASS_DEFINITION = 'class-definition',
  INHERITANCE = 'inheritance',
  
  // Functional patterns
  HIGHER_ORDER_FUNCTION = 'higher-order-function',
  CURRYING = 'currying',
  COMPOSITION = 'composition',
  
  // Python specific
  DECORATOR_PATTERN = 'decorator-pattern',
  GENERATOR_PATTERN = 'generator-pattern',
  LIST_COMPREHENSION = 'list-comprehension',
  CONTEXT_MANAGER = 'context-manager'
}

export interface APICall {
  object?: string;
  method: string;
  arguments?: ArgumentInfo[];
  isChained?: boolean;
  confidence: number;
}

export interface ArgumentInfo {
  type: 'string' | 'number' | 'boolean' | 'object' | 'function' | 'unknown';
  value?: any;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  lineCount: number;
  maxDepth: number;
  parameterCount?: number;
}

export interface CodeContext {
  language: 'javascript' | 'typescript' | 'python';
  fileName?: string;
  fileType?: string;
  imports?: ImportInfo[];
  exports?: ExportInfo[];
  currentFunction?: string;
  currentClass?: string;
  globalVariables?: string[];
  localVariables?: string[];
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  type: 'named' | 'default' | 'namespace';
}

export interface ExportInfo {
  name: string;
  type: 'named' | 'default';
  kind: 'function' | 'class' | 'variable' | 'type';
}

export interface CodeLocation {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

/**
 * Simplified features for API transmission
 */
export interface MatchingFeatures {
  language: string;
  syntaxFlags: string[]; // List of active syntax features
  patterns: string[]; // Pattern type strings
  apiSignatures: string[]; // Simplified API calls (e.g., "fetch", "Array.map")
  complexity: 'low' | 'medium' | 'high';
  contextHints?: {
    hasAsync?: boolean;
    hasErrorHandling?: boolean;
    usesDOM?: boolean;
    usesNode?: boolean;
    usesReact?: boolean;
  };
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  includeContext?: boolean;
  includeLocation?: boolean;
  maxDepth?: number;
  timeout?: number;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  features: CodeFeatures;
  matchingFeatures: MatchingFeatures;
  errors?: AnalysisError[];
  warnings?: string[];
  performance?: {
    parseTime: number;
    analysisTime: number;
    totalTime: number;
  };
}

export interface AnalysisError {
  type: 'parse' | 'analysis' | 'timeout';
  message: string;
  location?: CodeLocation;
}