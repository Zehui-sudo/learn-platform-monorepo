/**
 * Python Code Parser
 * 
 * Uses pattern matching and heuristics to analyze Python code
 * Note: For production, consider using tree-sitter or a Python AST service
 */

import {
  CodeFeatures,
  SyntaxFeatures,
  CodePattern,
  PatternType,
  APICall,
  ComplexityMetrics,
  CodeContext,
  ImportInfo,
  ExportInfo
} from '../types';
import { Logger } from '../../../utils/logger';

export class PythonParser {
  private logger = Logger.getInstance();

  /**
   * Parse Python code and extract features
   */
  async parse(code: string): Promise<CodeFeatures> {
    const startTime = Date.now();
    
    try {
      // Extract features using pattern matching
      const [syntax, patterns, apiCalls, complexity, context] = await Promise.all([
        this.extractSyntaxFeatures(code),
        this.extractPatterns(code),
        this.extractAPICalls(code),
        this.calculateComplexity(code),
        this.extractContext(code)
      ]);

      this.logger.debug('Python parsing completed', {
        parseTime: Date.now() - startTime,
        syntaxFeatures: Object.keys(syntax).filter(key => syntax[key as keyof SyntaxFeatures]).length,
        patterns: patterns.length,
        apiCalls: apiCalls.length
      });

      return {
        syntax,
        patterns,
        apiCalls,
        complexity,
        context
      };
    } catch (error) {
      this.logger.error('Failed to parse Python code', error);
      throw error;
    }
  }

  /**
   * Extract syntax features using pattern matching
   */
  private async extractSyntaxFeatures(code: string): Promise<SyntaxFeatures> {
    const features: SyntaxFeatures = {
      hasAsync: false,
      hasDecorator: false,
      hasPythonGenerator: false,
      hasListComp: false,
      hasContextManager: false,
      hasTyping: false,
      hasLambda: false,
      hasFString: false,
      hasTryCatch: false
    };

    // Check for async/await
    if (/\basync\s+def\b/.test(code) || /\bawait\s+/.test(code)) {
      features.hasAsync = true;
    }

    // Check for decorators
    if (/^\s*@\w+/m.test(code)) {
      features.hasDecorator = true;
    }

    // Check for generators
    if (/\byield\b/.test(code)) {
      features.hasPythonGenerator = true;
    }

    // Check for list comprehensions
    if (/\[.+\s+for\s+.+\s+in\s+.+\]/.test(code)) {
      features.hasListComp = true;
    }

    // Check for context managers (with statement)
    if (/\bwith\s+.+\s+as\s+/.test(code)) {
      features.hasContextManager = true;
    }

    // Check for type hints
    if (/:\s*(?:int|str|float|bool|List|Dict|Optional|Union|Any)\b/.test(code) || 
        /\->\s*(?:int|str|float|bool|List|Dict|Optional|Union|Any)\b/.test(code)) {
      features.hasTyping = true;
    }

    // Check for lambda functions
    if (/\blambda\s+[^:]+:/.test(code)) {
      features.hasLambda = true;
    }

    // Check for f-strings
    if (/f["'].*\{.*\}.*["']/.test(code)) {
      features.hasFString = true;
    }

    // Check for try/except
    if (/\btry\s*:/.test(code) && /\bexcept\b/.test(code)) {
      features.hasTryCatch = true;
    }

    return features;
  }

  /**
   * Extract code patterns
   */
  private async extractPatterns(code: string): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    const lines = code.split('\n');

    // Async/await pattern
    if (/\basync\s+def\b/.test(code) && /\bawait\s+/.test(code)) {
      patterns.push({
        type: PatternType.ASYNC_AWAIT,
        confidence: 1.0,
        description: 'Async function with await'
      });
    }

    // Decorator pattern
    const decoratorMatches = code.match(/^\s*@\w+/gm);
    if (decoratorMatches) {
      patterns.push({
        type: PatternType.DECORATOR_PATTERN,
        confidence: 1.0,
        description: `Found ${decoratorMatches.length} decorator(s)`
      });
    }

    // Generator pattern
    if (/\byield\b/.test(code)) {
      patterns.push({
        type: PatternType.GENERATOR_PATTERN,
        confidence: 1.0,
        description: 'Generator function'
      });
    }

    // List comprehension
    const listCompMatches = code.match(/\[.+\s+for\s+.+\s+in\s+.+\]/g);
    if (listCompMatches) {
      patterns.push({
        type: PatternType.LIST_COMPREHENSION,
        confidence: 1.0,
        description: `Found ${listCompMatches.length} list comprehension(s)`
      });
    }

    // Context manager pattern
    if (/\bwith\s+.+\s+as\s+/.test(code)) {
      patterns.push({
        type: PatternType.CONTEXT_MANAGER,
        confidence: 1.0,
        description: 'Context manager usage'
      });
    }

    // Error handling pattern
    if (/\btry\s*:/.test(code) && /\bexcept\b/.test(code)) {
      patterns.push({
        type: PatternType.ERROR_HANDLING,
        confidence: 1.0,
        description: 'Try/except error handling'
      });
    }

    // Class definition
    if (/\bclass\s+\w+/.test(code)) {
      patterns.push({
        type: PatternType.CLASS_DEFINITION,
        confidence: 1.0,
        description: 'Class definition'
      });
      
      // Check for inheritance
      if (/\bclass\s+\w+\s*\([^)]+\)/.test(code)) {
        patterns.push({
          type: PatternType.INHERITANCE,
          confidence: 0.9,
          description: 'Class inheritance'
        });
      }
    }

    // Loop patterns
    if (/\bfor\s+.+\s+in\s+/.test(code) || /\bwhile\s+/.test(code)) {
      patterns.push({
        type: PatternType.LOOP_PATTERN,
        confidence: 1.0,
        description: 'Loop structure'
      });
    }

    // Recursive pattern (heuristic: function calling itself)
    const funcDefs = code.match(/def\s+(\w+)\s*\(/g);
    if (funcDefs) {
      funcDefs.forEach(funcDef => {
        const funcName = funcDef.match(/def\s+(\w+)/)?.[1];
        if (funcName) {
          const funcCallRegex = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
          const calls = code.match(funcCallRegex);
          if (calls && calls.length > 1) { // Definition + at least one call
            patterns.push({
              type: PatternType.RECURSIVE,
              confidence: 0.8,
              description: `Possible recursive function: ${funcName}`
            });
          }
        }
      });
    }

    return patterns;
  }

  /**
   * Extract API calls
   */
  private async extractAPICalls(code: string): Promise<APICall[]> {
    const apiCalls: APICall[] = [];
    const callMap = new Map<string, APICall>();

    // Match method calls (object.method())
    const methodCalls = code.match(/\b(\w+)\.(\w+)\s*\(/g);
    if (methodCalls) {
      methodCalls.forEach(call => {
        const match = call.match(/\b(\w+)\.(\w+)/);
        if (match) {
          const [_, obj, method] = match;
          const key = `${obj}.${method}`;
          
          if (!callMap.has(key)) {
            const apiCall: APICall = {
              object: obj,
              method: method,
              confidence: 0.9
            };
            callMap.set(key, apiCall);
            apiCalls.push(apiCall);
          }
        }
      });
    }

    // Match function calls
    const funcCalls = code.match(/\b(\w+)\s*\(/g);
    if (funcCalls) {
      funcCalls.forEach(call => {
        const match = call.match(/\b(\w+)\s*\(/);
        if (match) {
          const funcName = match[1];
          
          // Skip Python keywords
          const keywords = ['if', 'for', 'while', 'with', 'def', 'class', 'try', 'except', 'elif', 'else'];
          if (!keywords.includes(funcName) && !callMap.has(funcName)) {
            const apiCall: APICall = {
              method: funcName,
              confidence: 0.8
            };
            callMap.set(funcName, apiCall);
            apiCalls.push(apiCall);
          }
        }
      });
    }

    // Identify common Python APIs
    const commonAPIs = [
      // Built-in functions
      { pattern: /\bprint\s*\(/, method: 'print', confidence: 1.0 },
      { pattern: /\blen\s*\(/, method: 'len', confidence: 1.0 },
      { pattern: /\brange\s*\(/, method: 'range', confidence: 1.0 },
      { pattern: /\bopen\s*\(/, method: 'open', confidence: 1.0 },
      { pattern: /\binput\s*\(/, method: 'input', confidence: 1.0 },
      
      // Common module methods
      { pattern: /\brequests\.(get|post|put|delete)\s*\(/, object: 'requests', confidence: 0.95 },
      { pattern: /\bpd\.DataFrame/, object: 'pandas', method: 'DataFrame', confidence: 0.95 },
      { pattern: /\bnp\.(array|zeros|ones)/, object: 'numpy', confidence: 0.95 },
      { pattern: /\bplt\.(plot|show|figure)/, object: 'matplotlib', confidence: 0.95 }
    ];

    commonAPIs.forEach(api => {
      if (api.pattern.test(code)) {
        const key = api.object ? `${api.object}.${api.method}` : api.method!;
        if (!callMap.has(key)) {
          const apiCall: APICall = {
            object: api.object,
            method: api.method || 'unknown',
            confidence: api.confidence
          };
          apiCalls.push(apiCall);
        }
      }
    });

    return apiCalls;
  }

  /**
   * Calculate complexity metrics
   */
  private async calculateComplexity(code: string): Promise<ComplexityMetrics> {
    const lines = code.split('\n');
    let cyclomaticComplexity = 1;
    let cognitiveComplexity = 0;
    let maxDepth = 0;
    let currentDepth = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Count indentation depth
      const indentMatch = line.match(/^(\s*)/);
      if (indentMatch) {
        const indent = indentMatch[1].length;
        currentDepth = Math.floor(indent / 4); // Assuming 4 spaces per indent
        maxDepth = Math.max(maxDepth, currentDepth);
      }

      // Branching statements
      if (/\bif\b/.test(trimmed)) {
        cyclomaticComplexity++;
        cognitiveComplexity += 1 + currentDepth;
      }
      if (/\belif\b/.test(trimmed)) {
        cyclomaticComplexity++;
        cognitiveComplexity += 1;
      }
      if (/\belse\b/.test(trimmed)) {
        cognitiveComplexity += 1;
      }
      
      // Loops
      if (/\bfor\b/.test(trimmed) || /\bwhile\b/.test(trimmed)) {
        cyclomaticComplexity++;
        cognitiveComplexity += 2 + currentDepth;
      }
      
      // Exception handling
      if (/\bexcept\b/.test(trimmed)) {
        cyclomaticComplexity++;
        cognitiveComplexity += 1;
      }
      
      // Logical operators
      const andCount = (trimmed.match(/\band\b/g) || []).length;
      const orCount = (trimmed.match(/\bor\b/g) || []).length;
      cyclomaticComplexity += andCount + orCount;
      cognitiveComplexity += andCount + orCount;
    });

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      lineCount: lines.length,
      maxDepth
    };
  }

  /**
   * Extract context information
   */
  private async extractContext(code: string): Promise<CodeContext> {
    const context: CodeContext = {
      language: 'python',
      imports: [],
      exports: [],
      globalVariables: [],
      localVariables: []
    };

    const lines = code.split('\n');

    // Extract imports
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // import module
      let match = trimmed.match(/^import\s+([\w\s,]+)/);
      if (match) {
        const modules = match[1].split(',').map(m => m.trim());
        modules.forEach(module => {
          context.imports?.push({
            source: module,
            specifiers: [module],
            type: 'default'
          });
        });
      }
      
      // from module import ...
      match = trimmed.match(/^from\s+([\w.]+)\s+import\s+(.+)/);
      if (match) {
        const source = match[1];
        const importsStr = match[2];
        
        if (importsStr === '*') {
          context.imports?.push({
            source,
            specifiers: ['*'],
            type: 'namespace'
          });
        } else {
          const specifiers = importsStr.split(',').map(s => s.trim().split(' as ')[0]);
          context.imports?.push({
            source,
            specifiers,
            type: 'named'
          });
        }
      }
    });

    // Extract global variables (simple heuristic: top-level assignments)
    lines.forEach((line, index) => {
      if (!/^\s/.test(line)) { // No indentation
        const match = line.match(/^(\w+)\s*=/);
        if (match && !line.startsWith('def ') && !line.startsWith('class ')) {
          context.globalVariables?.push(match[1]);
        }
      }
    });

    // Extract function and class names
    const funcMatches = code.match(/^def\s+(\w+)/gm);
    if (funcMatches) {
      funcMatches.forEach(match => {
        const name = match.replace(/^def\s+/, '');
        context.exports?.push({
          name,
          type: 'named',
          kind: 'function'
        });
      });
    }

    const classMatches = code.match(/^class\s+(\w+)/gm);
    if (classMatches) {
      classMatches.forEach(match => {
        const name = match.replace(/^class\s+/, '');
        context.exports?.push({
          name,
          type: 'named',
          kind: 'class'
        });
      });
    }

    return context;
  }
}