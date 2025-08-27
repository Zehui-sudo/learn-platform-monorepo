/**
 * JavaScript/TypeScript AST Parser
 * 
 * Uses Babel parser to analyze JavaScript and TypeScript code
 */

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import {
  CodeFeatures,
  SyntaxFeatures,
  CodePattern,
  PatternType,
  APICall,
  ComplexityMetrics,
  CodeContext,
  ImportInfo,
  ExportInfo,
  CodeLocation,
  ArgumentInfo
} from '../types';
import { Logger } from '../../../utils/logger';

export class JavaScriptParser {
  private logger = Logger.getInstance();

  /**
   * Parse JavaScript/TypeScript code and extract features
   */
  async parse(code: string, isTypeScript: boolean = false): Promise<CodeFeatures> {
    const startTime = Date.now();
    
    try {
      // Parse code into AST
      const ast = this.parseToAST(code, isTypeScript);
      
      // Extract features in parallel where possible
      const [syntax, patterns, apiCalls, complexity, context] = await Promise.all([
        this.extractSyntaxFeatures(ast),
        this.extractPatterns(ast),
        this.extractAPICalls(ast),
        this.calculateComplexity(ast),
        this.extractContext(ast, isTypeScript)
      ]);

      this.logger.debug('JavaScript parsing completed', {
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
      this.logger.error('Failed to parse JavaScript code', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        codeSnippet: code.substring(0, 100),
        isTypeScript
      });
      throw error;
    }
  }

  /**
   * Parse code to AST
   */
  private parseToAST(code: string, isTypeScript: boolean): any {
    const plugins: parser.ParserPlugin[] = ['jsx'];
    
    if (isTypeScript) {
      plugins.push('typescript');
    } else {
      // JavaScript-specific plugins
      plugins.push('flow');
    }
    
    // Add common plugins
    plugins.push(
      'decorators-legacy',
      'dynamicImport',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'asyncGenerators',
      'functionBind',
      'functionSent',
      'objectRestSpread',
      'optionalChaining',
      'nullishCoalescingOperator'
    );

    try {
      // Try to parse as a complete program first
      return parser.parse(code, {
        sourceType: 'unambiguous',
        plugins,
        errorRecovery: true
      });
    } catch (error) {
      // If it fails, wrap in a function to ensure we have a valid program
      // This handles code snippets that are not complete programs
      const wrappedCode = `(function() {\n${code}\n})()`;
      try {
        return parser.parse(wrappedCode, {
          sourceType: 'unambiguous',
          plugins,
          errorRecovery: true
        });
      } catch (wrapError) {
        // If wrapping also fails, return a minimal AST
        this.logger.warn('Failed to parse code, returning minimal AST', {
          originalError: error instanceof Error ? error.message : String(error),
          wrapError: wrapError instanceof Error ? wrapError.message : String(wrapError),
          codeSnippet: code.substring(0, 100)
        });
        // Return empty program AST to avoid traverse errors
        return {
          type: 'File',
          program: {
            type: 'Program',
            body: [],
            directives: [],
            sourceType: 'script'
          }
        };
      }
    }
  }

  /**
   * Extract syntax features
   */
  private async extractSyntaxFeatures(ast: any): Promise<SyntaxFeatures> {
    const features: SyntaxFeatures = {
      hasAsync: false,
      hasPromise: false,
      hasArrowFunction: false,
      hasDestructuring: false,
      hasSpread: false,
      hasTemplate: false,
      hasClassSyntax: false,
      hasTryCatch: false,
      hasGenerator: false
    };

    traverse(ast, {
      // Async functions (using FunctionDeclaration and checking async property)
      FunctionDeclaration(path) {
        if (path.node.async) {
          features.hasAsync = true;
        }
        if (path.node.generator) {
          features.hasGenerator = true;
        }
      },
      FunctionExpression(path) {
        if (path.node.async) {
          features.hasAsync = true;
        }
        if (path.node.generator) {
          features.hasGenerator = true;
        }
      },
      ArrowFunctionExpression(path) {
        if (path.node.async) {
          features.hasAsync = true;
        }
        features.hasArrowFunction = true;
      },
      AwaitExpression() {
        features.hasAsync = true;
      },
      
      // Promises
      NewExpression(path) {
        if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'Promise') {
          features.hasPromise = true;
        }
      },
      MemberExpression(path) {
        if (t.isIdentifier(path.node.property)) {
          const propName = path.node.property.name;
          if (['then', 'catch', 'finally'].includes(propName)) {
            features.hasPromise = true;
          }
        }
      },
      
      
      // Destructuring
      ObjectPattern() {
        features.hasDestructuring = true;
      },
      ArrayPattern() {
        features.hasDestructuring = true;
      },
      
      // Spread operator
      SpreadElement() {
        features.hasSpread = true;
      },
      RestElement() {
        features.hasSpread = true;
      },
      
      // Template literals
      TemplateLiteral() {
        features.hasTemplate = true;
      },
      
      // Classes
      ClassDeclaration() {
        features.hasClassSyntax = true;
      },
      ClassExpression() {
        features.hasClassSyntax = true;
      },
      
      // Try-catch
      TryStatement() {
        features.hasTryCatch = true;
      },
      
    });

    return features;
  }

  /**
   * Extract code patterns
   */
  private async extractPatterns(ast: any): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    const patternMap = new Map<PatternType, number>();

    traverse(ast, {
      // Async/await pattern (check for async functions)
      FunctionDeclaration: (path) => {
        if (path.node.async) {
          const hasAwait = path.node.body.body?.some((stmt: any) => 
            this.containsAwait(stmt)
          );
          if (hasAwait) {
            this.addPattern(patterns, patternMap, PatternType.ASYNC_AWAIT, 1.0, path.node.loc);
          }
        }
        
        // Check for higher-order function
        const body = path.node.body.body;
        if (body) {
          const returnsFunction = body.some((stmt: any) =>
            t.isReturnStatement(stmt) && t.isFunction(stmt.argument)
          );
          if (returnsFunction) {
            this.addPattern(patterns, patternMap, PatternType.HIGHER_ORDER_FUNCTION, 0.9, path.node.loc);
          }
        }
      },
      FunctionExpression: (path) => {
        if (path.node.async) {
          this.addPattern(patterns, patternMap, PatternType.ASYNC_AWAIT, 0.9, path.node.loc);
        }
      },
      ArrowFunctionExpression: (path) => {
        if (path.node.async) {
          this.addPattern(patterns, patternMap, PatternType.ASYNC_AWAIT, 0.9, path.node.loc);
        }
      },
      
      // Promise chain pattern
      CallExpression: (path) => {
        if (this.isPromiseChain(path.node)) {
          this.addPattern(patterns, patternMap, PatternType.PROMISE_CHAIN, 0.9, path.node.loc);
        }
        
        // Callback pattern
        const args = path.node.arguments;
        if (args.some((arg: any) => t.isFunction(arg))) {
          this.addPattern(patterns, patternMap, PatternType.CALLBACK, 0.7, path.node.loc);
        }
      },
      
      // Error handling pattern
      TryStatement: (path) => {
        this.addPattern(patterns, patternMap, PatternType.ERROR_HANDLING, 1.0, path.node.loc);
        this.addPattern(patterns, patternMap, PatternType.TRY_CATCH, 1.0, path.node.loc);
      },
      
      // Array methods pattern
      MemberExpression: (path) => {
        if (t.isIdentifier(path.node.property)) {
          const method = path.node.property.name;
          const arrayMethods = ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every'];
          if (arrayMethods.includes(method)) {
            this.addPattern(patterns, patternMap, PatternType.ARRAY_METHODS, 0.9, path.node.loc);
          }
        }
      },
      
      // Destructuring patterns
      ObjectPattern: (path) => {
        this.addPattern(patterns, patternMap, PatternType.OBJECT_DESTRUCTURING, 1.0, path.node.loc);
      },
      ArrayPattern: (path) => {
        this.addPattern(patterns, patternMap, PatternType.ARRAY_DESTRUCTURING, 1.0, path.node.loc);
      },
      
      // Class patterns
      ClassDeclaration: (path) => {
        this.addPattern(patterns, patternMap, PatternType.CLASS_DEFINITION, 1.0, path.node.loc);
        
        // Check for inheritance
        if (path.node.superClass) {
          this.addPattern(patterns, patternMap, PatternType.INHERITANCE, 1.0, path.node.loc);
        }
      }
    });

    return patterns;
  }

  /**
   * Extract API calls
   */
  private async extractAPICalls(ast: any): Promise<APICall[]> {
    const apiCalls: APICall[] = [];
    const callMap = new Map<string, APICall>();

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        
        // Method calls (object.method())
        if (t.isMemberExpression(callee)) {
          const apiCall = extractMemberCall(callee, path.node.arguments);
          if (apiCall) {
            const key = `${apiCall.object}.${apiCall.method}`;
            if (!callMap.has(key)) {
              callMap.set(key, apiCall);
              apiCalls.push(apiCall);
            }
          }
        }
        
        // Function calls (functionName())
        else if (t.isIdentifier(callee)) {
          const apiCall: APICall = {
            method: callee.name,
            arguments: extractArguments(path.node.arguments),
            confidence: 0.9
          };
          
          const key = apiCall.method;
          if (!callMap.has(key)) {
            callMap.set(key, apiCall);
            apiCalls.push(apiCall);
          }
        }
      },
      
      // New expressions (new ClassName())
      NewExpression(path) {
        if (t.isIdentifier(path.node.callee)) {
          const apiCall: APICall = {
            method: `new ${path.node.callee.name}`,
            arguments: extractArguments(path.node.arguments),
            confidence: 1.0
          };
          
          const key = apiCall.method;
          if (!callMap.has(key)) {
            callMap.set(key, apiCall);
            apiCalls.push(apiCall);
          }
        }
      }
    });

    // Helper function to extract member call
    function extractMemberCall(node: any, args: any[]): APICall | null {
      if (!t.isIdentifier(node.property)) return null;
      
      let object = 'unknown';
      if (t.isIdentifier(node.object)) {
        object = node.object.name;
      } else if (t.isThisExpression(node.object)) {
        object = 'this';
      } else if (t.isMemberExpression(node.object)) {
        // Handle chained calls
        const chain = extractCallChain(node.object);
        object = chain;
      }
      
      return {
        object,
        method: node.property.name,
        arguments: extractArguments(args),
        isChained: t.isMemberExpression(node.object),
        confidence: 0.9
      };
    }
    
    // Helper function to extract call chain
    function extractCallChain(node: any): string {
      if (t.isIdentifier(node)) {
        return node.name;
      }
      if (t.isMemberExpression(node)) {
        const obj = extractCallChain(node.object);
        const prop = t.isIdentifier(node.property) ? node.property.name : '[]';
        return `${obj}.${prop}`;
      }
      return 'unknown';
    }
    
    // Helper function to extract arguments
    function extractArguments(args: any[]): ArgumentInfo[] {
      return args.slice(0, 3).map(arg => { // Limit to first 3 arguments
        if (t.isStringLiteral(arg)) {
          return { type: 'string', value: arg.value };
        }
        if (t.isNumericLiteral(arg)) {
          return { type: 'number', value: arg.value };
        }
        if (t.isBooleanLiteral(arg)) {
          return { type: 'boolean', value: arg.value };
        }
        if (t.isFunction(arg)) {
          return { type: 'function' };
        }
        if (t.isObjectExpression(arg)) {
          return { type: 'object' };
        }
        return { type: 'unknown' };
      });
    }

    return apiCalls;
  }

  /**
   * Calculate complexity metrics
   */
  private async calculateComplexity(ast: any): Promise<ComplexityMetrics> {
    let cyclomaticComplexity = 1; // Base complexity
    let cognitiveComplexity = 0;
    let maxDepth = 0;
    let currentDepth = 0;
    let lineCount = 0;

    // Count lines
    if (ast.loc) {
      lineCount = ast.loc.end.line - ast.loc.start.line + 1;
    }

    traverse(ast, {
      // Increase complexity for branching
      IfStatement() {
        cyclomaticComplexity++;
        cognitiveComplexity++;
      },
      ConditionalExpression() {
        cyclomaticComplexity++;
        cognitiveComplexity++;
      },
      SwitchCase() {
        cyclomaticComplexity++;
      },
      
      // Loops
      ForStatement() {
        cyclomaticComplexity++;
        cognitiveComplexity += 2; // Loops are more complex
      },
      WhileStatement() {
        cyclomaticComplexity++;
        cognitiveComplexity += 2;
      },
      DoWhileStatement() {
        cyclomaticComplexity++;
        cognitiveComplexity += 2;
      },
      
      // Logical operators
      LogicalExpression(path) {
        if (path.node.operator === '&&' || path.node.operator === '||') {
          cyclomaticComplexity++;
        }
      },
      
      // Track nesting depth
      BlockStatement: {
        enter() {
          currentDepth++;
          maxDepth = Math.max(maxDepth, currentDepth);
        },
        exit() {
          currentDepth--;
        }
      },
      
      // Catch blocks
      CatchClause() {
        cyclomaticComplexity++;
        cognitiveComplexity++;
      }
    });

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      lineCount,
      maxDepth
    };
  }

  /**
   * Extract context information
   */
  private async extractContext(ast: any, isTypeScript: boolean): Promise<CodeContext> {
    const context: CodeContext = {
      language: isTypeScript ? 'typescript' : 'javascript',
      imports: [],
      exports: [],
      globalVariables: [],
      localVariables: []
    };

    traverse(ast, {
      // Imports
      ImportDeclaration(path) {
        const importInfo: ImportInfo = {
          source: path.node.source.value,
          specifiers: [],
          type: 'named'
        };
        
        path.node.specifiers.forEach(spec => {
          if (t.isImportDefaultSpecifier(spec)) {
            importInfo.type = 'default';
            importInfo.specifiers.push(spec.local.name);
          } else if (t.isImportNamespaceSpecifier(spec)) {
            importInfo.type = 'namespace';
            importInfo.specifiers.push(spec.local.name);
          } else if (t.isImportSpecifier(spec)) {
            importInfo.specifiers.push(spec.local.name);
          }
        });
        
        context.imports?.push(importInfo);
      },
      
      // Exports
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
            context.exports?.push({
              name: path.node.declaration.id.name,
              type: 'named',
              kind: 'function'
            });
          } else if (t.isClassDeclaration(path.node.declaration) && path.node.declaration.id) {
            context.exports?.push({
              name: path.node.declaration.id.name,
              type: 'named',
              kind: 'class'
            });
          } else if (t.isVariableDeclaration(path.node.declaration)) {
            path.node.declaration.declarations.forEach(decl => {
              if (t.isIdentifier(decl.id)) {
                context.exports?.push({
                  name: decl.id.name,
                  type: 'named',
                  kind: 'variable'
                });
              }
            });
          }
        }
      },
      
      ExportDefaultDeclaration() {
        context.exports?.push({
          name: 'default',
          type: 'default',
          kind: 'variable'
        });
      },
      
      // Variable declarations at program level (global)
      Program(path) {
        path.node.body.forEach(node => {
          if (t.isVariableDeclaration(node)) {
            node.declarations.forEach(decl => {
              if (t.isIdentifier(decl.id)) {
                context.globalVariables?.push(decl.id.name);
              }
            });
          }
        });
      }
    });

    return context;
  }

  /**
   * Helper: Check if a node contains await
   */
  private containsAwait(node: any): boolean {
    let hasAwait = false;
    
    // Use simple recursive check instead of traverse to avoid scope issues
    const checkNode = (n: any): boolean => {
      if (!n || typeof n !== 'object') return false;
      
      // Check if current node is an await expression
      if (n.type === 'AwaitExpression') {
        return true;
      }
      
      // Recursively check all properties
      for (const key in n) {
        if (key === 'loc' || key === 'range' || key === 'leadingComments' || key === 'trailingComments') {
          continue; // Skip metadata
        }
        
        const value = n[key];
        if (Array.isArray(value)) {
          for (const item of value) {
            if (checkNode(item)) return true;
          }
        } else if (typeof value === 'object' && value !== null) {
          if (checkNode(value)) return true;
        }
      }
      
      return false;
    };
    
    hasAwait = checkNode(node);
    return hasAwait;
  }

  /**
   * Helper: Check if a call is a promise chain
   */
  private isPromiseChain(node: any): boolean {
    if (!t.isMemberExpression(node.callee)) return false;
    if (!t.isIdentifier(node.callee.property)) return false;
    
    const method = node.callee.property.name;
    const promiseMethods = ['then', 'catch', 'finally'];
    
    return promiseMethods.includes(method);
  }

  /**
   * Helper: Add pattern to list with deduplication
   */
  private addPattern(
    patterns: CodePattern[], 
    patternMap: Map<PatternType, number>,
    type: PatternType,
    confidence: number,
    location?: any
  ): void {
    // Update confidence if pattern already exists
    if (patternMap.has(type)) {
      const currentConfidence = patternMap.get(type)!;
      patternMap.set(type, Math.min(1.0, currentConfidence + 0.1));
      
      // Update the existing pattern
      const existingPattern = patterns.find(p => p.type === type);
      if (existingPattern) {
        existingPattern.confidence = patternMap.get(type)!;
      }
    } else {
      // Add new pattern
      patternMap.set(type, confidence);
      const pattern: CodePattern = { type, confidence };
      
      if (location) {
        pattern.location = {
          line: location.start.line,
          column: location.start.column,
          endLine: location.end.line,
          endColumn: location.end.column
        };
      }
      
      patterns.push(pattern);
    }
  }
}