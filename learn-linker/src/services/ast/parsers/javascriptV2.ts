/**
 * JavaScript/TypeScript AST Parser V2
 * 
 * Uses Babel parser to analyze JavaScript and TypeScript code
 * Returns string-based tags instead of boolean flags
 */

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import {
  CodeFeatures,
  ComplexityMetrics,
  CodeContext,
  ImportInfo,
  ExportInfo,
  SyntaxTags,
  PatternTags,
  ConceptTags
} from '../types';
import { Logger } from '../../../utils/logger';

export class JavaScriptParserV2 {
  private logger = Logger.getInstance();

  /**
   * Parse JavaScript/TypeScript code and extract features
   */
  async parse(code: string, isTypeScript: boolean = false): Promise<CodeFeatures> {
    const startTime = Date.now();
    
    try {
      // Parse code into AST
      const ast = this.parseToAST(code, isTypeScript);
      
      // Extract features
      const syntax = await this.extractSyntaxTags(ast);
      const patterns = await this.extractPatternTags(ast);
      const apis = await this.extractAPITags(ast);
      const concepts = await this.extractConceptTags(ast, code);
      const complexity = await this.calculateComplexity(ast);
      const context = await this.extractContext(ast, isTypeScript);

      this.logger.debug('JavaScript parsing completed', {
        parseTime: Date.now() - startTime,
        syntaxTags: syntax.length,
        patternTags: patterns.length,
        apiTags: apis.length,
        conceptTags: concepts.length
      });

      return {
        syntax,
        patterns,
        apis,
        concepts,
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
      // Return empty features on error
      return {
        syntax: [],
        patterns: [],
        apis: [],
        concepts: [],
        complexity: {
          cyclomaticComplexity: 0,
          cognitiveComplexity: 0,
          lineCount: 0,
          maxDepth: 0
        },
        context: {
          language: isTypeScript ? 'typescript' : 'javascript',
          imports: [],
          exports: [],
          globalVariables: [],
          localVariables: []
        }
      };
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
      return parser.parse(code, {
        sourceType: 'unambiguous',
        plugins,
        errorRecovery: true
      });
    } catch (error) {
      // Try wrapping in function for snippets
      const wrappedCode = `(function() {\n${code}\n})()`;
      try {
        return parser.parse(wrappedCode, {
          sourceType: 'unambiguous',
          plugins,
          errorRecovery: true
        });
      } catch {
        // Return minimal AST on failure
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
   * Extract syntax tags from AST
   */
  private async extractSyntaxTags(ast: any): Promise<string[]> {
    const tags = new Set<string>();

    traverse(ast, {
      // Variable declarations
      VariableDeclaration(path) {
        if (path.node.kind === 'var') tags.add(SyntaxTags.VAR);
        if (path.node.kind === 'let') tags.add(SyntaxTags.LET);
        if (path.node.kind === 'const') tags.add(SyntaxTags.CONST);
      },

      // Functions
      FunctionDeclaration(path) {
        tags.add(SyntaxTags.FUNCTION);
        if (path.node.async) tags.add(SyntaxTags.ASYNC);
        if (path.node.generator) tags.add(SyntaxTags.GENERATOR);
      },
      FunctionExpression(path) {
        tags.add(SyntaxTags.FUNCTION);
        if (path.node.async) tags.add(SyntaxTags.ASYNC);
        if (path.node.generator) tags.add(SyntaxTags.GENERATOR);
      },
      ArrowFunctionExpression(path) {
        tags.add(SyntaxTags.ARROW_FUNCTION);
        if (path.node.async) tags.add(SyntaxTags.ASYNC);
      },
      AwaitExpression() {
        tags.add(SyntaxTags.AWAIT);
      },

      // Template literals
      TemplateLiteral() {
        tags.add(SyntaxTags.TEMPLATE_LITERAL);
      },

      // Destructuring
      ObjectPattern() {
        tags.add(SyntaxTags.DESTRUCTURING);
      },
      ArrayPattern() {
        tags.add(SyntaxTags.DESTRUCTURING);
      },

      // Spread/Rest
      SpreadElement() {
        tags.add(SyntaxTags.SPREAD);
      },
      RestElement() {
        tags.add(SyntaxTags.REST);
      },

      // Classes
      ClassDeclaration() {
        tags.add(SyntaxTags.CLASS);
      },
      ClassExpression() {
        tags.add(SyntaxTags.CLASS);
      },
      Super() {
        tags.add(SyntaxTags.SUPER);
      },

      // Control flow
      IfStatement() {
        tags.add(SyntaxTags.IF_ELSE);
      },
      SwitchStatement() {
        tags.add(SyntaxTags.SWITCH);
      },
      ForStatement() {
        tags.add(SyntaxTags.FOR);
      },
      ForOfStatement() {
        tags.add(SyntaxTags.FOR_OF);
      },
      ForInStatement() {
        tags.add(SyntaxTags.FOR_IN);
      },
      WhileStatement() {
        tags.add(SyntaxTags.WHILE);
      },
      DoWhileStatement() {
        tags.add(SyntaxTags.DO_WHILE);
      },

      // Error handling
      TryStatement() {
        tags.add(SyntaxTags.TRY_CATCH);
      },
      ThrowStatement() {
        tags.add(SyntaxTags.THROW);
      },
      CatchClause() {
        tags.add(SyntaxTags.TRY_CATCH);
      },

      // Modules
      ImportDeclaration() {
        tags.add(SyntaxTags.IMPORT);
      },
      ExportNamedDeclaration() {
        tags.add(SyntaxTags.EXPORT);
      },
      ExportDefaultDeclaration() {
        tags.add(SyntaxTags.EXPORT);
      },

      // Operators
      ConditionalExpression() {
        tags.add(SyntaxTags.TERNARY);
      },
      OptionalMemberExpression() {
        tags.add(SyntaxTags.OPTIONAL_CHAINING);
      },
      LogicalExpression(path) {
        if (path.node.operator === '??') {
          tags.add(SyntaxTags.NULLISH_COALESCING);
        }
      }
    });

    return Array.from(tags);
  }

  /**
   * Extract pattern tags from AST
   */
  private async extractPatternTags(ast: any): Promise<string[]> {
    const patterns = new Set<string>();

    traverse(ast, {
      // Async patterns
      FunctionDeclaration(path) {
        if (path.node.async && this.containsAwait(path.node.body)) {
          patterns.add(PatternTags.ASYNC_AWAIT);
        }
      },
      FunctionExpression(path) {
        if (path.node.async) {
          patterns.add(PatternTags.ASYNC_AWAIT);
        }
      },
      ArrowFunctionExpression(path) {
        if (path.node.async) {
          patterns.add(PatternTags.ASYNC_AWAIT);
        }
      },

      // Promise patterns
      CallExpression(path) {
        if (this.isPromiseChain(path.node)) {
          patterns.add(PatternTags.PROMISE_CHAIN);
        }
        
        // Callback pattern
        if (path.node.arguments.some((arg: any) => t.isFunction(arg))) {
          patterns.add(PatternTags.CALLBACK);
        }

        // Event handler pattern
        if (t.isMemberExpression(path.node.callee) && 
            t.isIdentifier(path.node.callee.property) &&
            path.node.callee.property.name === 'addEventListener') {
          patterns.add(PatternTags.EVENT_HANDLER);
        }
      },

      // Array methods pattern
      MemberExpression(path) {
        if (t.isIdentifier(path.node.property)) {
          const method = path.node.property.name;
          const arrayMethods = ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every'];
          if (arrayMethods.includes(method)) {
            patterns.add(PatternTags.ARRAY_METHODS);
          }
        }
      },

      // Error handling pattern
      TryStatement() {
        patterns.add(PatternTags.ERROR_HANDLING);
        patterns.add(PatternTags.TRY_CATCH);
      },

      // Destructuring patterns
      ObjectPattern() {
        patterns.add(PatternTags.OBJECT_DESTRUCTURING);
      },
      ArrayPattern() {
        patterns.add(PatternTags.ARRAY_DESTRUCTURING);
      },

      // Class patterns
      ClassDeclaration(path) {
        patterns.add(PatternTags.CLASS_DEFINITION);
        if (path.node.superClass) {
          patterns.add(PatternTags.INHERITANCE);
        }
      },

      // Loop patterns
      ForStatement() {
        patterns.add(PatternTags.LOOP);
      },
      WhileStatement() {
        patterns.add(PatternTags.LOOP);
      },
      DoWhileStatement() {
        patterns.add(PatternTags.LOOP);
      },
      ForOfStatement() {
        patterns.add(PatternTags.LOOP);
      },
      ForInStatement() {
        patterns.add(PatternTags.LOOP);
      },

      // Conditional patterns
      IfStatement() {
        patterns.add(PatternTags.CONDITIONAL);
      },
      ConditionalExpression() {
        patterns.add(PatternTags.CONDITIONAL);
      },

      // Higher-order functions
      FunctionDeclaration(path) {
        if (this.returnsFunction(path.node.body)) {
          patterns.add(PatternTags.HIGHER_ORDER_FUNCTION);
        }
      }
    });

    // Check for module pattern
    traverse(ast, {
      Program(path) {
        const hasImports = path.node.body.some((node: any) => t.isImportDeclaration(node));
        const hasExports = path.node.body.some((node: any) => 
          t.isExportNamedDeclaration(node) || t.isExportDefaultDeclaration(node)
        );
        if (hasImports || hasExports) {
          patterns.add(PatternTags.MODULE_PATTERN);
        }
      }
    });

    return Array.from(patterns);
  }

  /**
   * Extract API tags from AST
   */
  private async extractAPITags(ast: any): Promise<string[]> {
    const apis = new Set<string>();

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        
        // Method calls (object.method())
        if (t.isMemberExpression(callee)) {
          const apiCall = this.extractMemberCall(callee);
          if (apiCall) {
            apis.add(apiCall);
          }
        }
        
        // Function calls (functionName())
        else if (t.isIdentifier(callee)) {
          apis.add(callee.name);
        }
      },
      
      // New expressions (new ClassName())
      NewExpression(path) {
        if (t.isIdentifier(path.node.callee)) {
          apis.add(path.node.callee.name);
        }
      }
    });

    return Array.from(apis);
  }

  /**
   * Extract member call as standardized API string
   */
  private extractMemberCall(node: any): string | null {
    if (!t.isIdentifier(node.property)) return null;
    
    let object = 'unknown';
    if (t.isIdentifier(node.object)) {
      object = node.object.name;
    } else if (t.isThisExpression(node.object)) {
      object = 'this';
    } else if (t.isMemberExpression(node.object)) {
      // Handle chained calls
      object = this.extractCallChain(node.object);
    }
    
    // Standardize common APIs
    const method = node.property.name;
    
    // Array methods
    if (['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every', 'includes', 'indexOf', 'slice', 'splice', 'push', 'pop', 'shift', 'unshift', 'sort', 'reverse', 'join', 'concat'].includes(method)) {
      if (object === 'unknown' || /^[a-z]/.test(object)) {
        return `Array.${method}`;
      }
    }
    
    // Object methods
    if (['keys', 'values', 'entries', 'assign', 'create', 'freeze', 'seal'].includes(method) && object === 'Object') {
      return `Object.${method}`;
    }
    
    // Promise methods
    if (['all', 'race', 'resolve', 'reject', 'allSettled'].includes(method) && object === 'Promise') {
      return `Promise.${method}`;
    }
    
    // String methods
    if (['split', 'trim', 'toLowerCase', 'toUpperCase', 'substring', 'substr', 'slice', 'indexOf', 'lastIndexOf', 'replace', 'match', 'search'].includes(method)) {
      if (object === 'unknown' || /^[a-z]/.test(object)) {
        return `String.${method}`;
      }
    }
    
    // DOM APIs
    if (object === 'document') {
      return `document.${method}`;
    }
    
    // Console APIs
    if (object === 'console') {
      return `console.${method}`;
    }
    
    // Default: return as is
    return `${object}.${method}`;
  }

  /**
   * Extract call chain
   */
  private extractCallChain(node: any): string {
    if (t.isIdentifier(node)) {
      return node.name;
    }
    if (t.isMemberExpression(node)) {
      const obj = this.extractCallChain(node.object);
      const prop = t.isIdentifier(node.property) ? node.property.name : '[]';
      return `${obj}.${prop}`;
    }
    return 'unknown';
  }

  /**
   * Extract concept tags based on code patterns
   */
  private async extractConceptTags(ast: any, code: string): Promise<string[]> {
    const concepts = new Set<string>();

    // Check for closures
    let hasClosures = false;
    traverse(ast, {
      FunctionDeclaration(path) {
        const parent = path.getFunctionParent();
        if (parent && parent.node !== path.node) {
          // Function inside function - potential closure
          const usesOuterVars = path.node.body.body?.some((stmt: any) => 
            this.usesOuterScopeVariables(stmt, path.scope)
          );
          if (usesOuterVars) {
            hasClosures = true;
            concepts.add(ConceptTags.CLOSURE);
          }
        }
      },
      ArrowFunctionExpression(path) {
        const parent = path.getFunctionParent();
        if (parent) {
          hasClosures = true;
          concepts.add(ConceptTags.CLOSURE);
        }
      }
    });

    // Check for hoisting patterns (var usage before declaration)
    traverse(ast, {
      VariableDeclaration(path) {
        if (path.node.kind === 'var') {
          concepts.add(ConceptTags.HOISTING);
        }
      },
      FunctionDeclaration() {
        // Function declarations are hoisted
        concepts.add(ConceptTags.HOISTING);
      }
    });

    // Check for this binding
    traverse(ast, {
      ThisExpression() {
        concepts.add(ConceptTags.THIS_BINDING);
      },
      CallExpression(path) {
        if (t.isMemberExpression(path.node.callee) && 
            t.isIdentifier(path.node.callee.property)) {
          const method = path.node.callee.property.name;
          if (['call', 'apply', 'bind'].includes(method)) {
            concepts.add(ConceptTags.THIS_BINDING);
          }
        }
      }
    });

    // Check for prototype usage
    if (code.includes('prototype') || code.includes('__proto__')) {
      concepts.add(ConceptTags.PROTOTYPE_CHAIN);
    }

    // Check for async control flow
    let hasAsyncPatterns = false;
    traverse(ast, {
      AwaitExpression() {
        hasAsyncPatterns = true;
      },
      CallExpression(path) {
        if (this.isPromiseChain(path.node)) {
          hasAsyncPatterns = true;
        }
      }
    });
    if (hasAsyncPatterns) {
      concepts.add(ConceptTags.ASYNC_CONTROL_FLOW);
      concepts.add(ConceptTags.EVENT_LOOP);
    }

    // Check for recursion
    traverse(ast, {
      FunctionDeclaration(path) {
        if (path.node.id && this.containsRecursiveCall(path.node.body, path.node.id.name)) {
          concepts.add(ConceptTags.RECURSION);
        }
      }
    });

    // Check for callback hell (nested callbacks)
    let callbackDepth = 0;
    let maxCallbackDepth = 0;
    traverse(ast, {
      CallExpression: {
        enter(path) {
          const hasCallbackArg = path.node.arguments.some((arg: any) => t.isFunction(arg));
          if (hasCallbackArg) {
            callbackDepth++;
            maxCallbackDepth = Math.max(maxCallbackDepth, callbackDepth);
          }
        },
        exit(path) {
          const hasCallbackArg = path.node.arguments.some((arg: any) => t.isFunction(arg));
          if (hasCallbackArg) {
            callbackDepth--;
          }
        }
      }
    });
    if (maxCallbackDepth >= 3) {
      concepts.add(ConceptTags.CALLBACK_HELL);
    }

    // Check for type coercion patterns
    if (code.includes('==') && !code.includes('===')) {
      concepts.add(ConceptTags.TYPE_COERCION);
    }

    return Array.from(concepts);
  }

  /**
   * Helper: Check if node contains await
   */
  private containsAwait(node: any): boolean {
    const checkNode = (n: any): boolean => {
      if (!n || typeof n !== 'object') return false;
      
      if (n.type === 'AwaitExpression') {
        return true;
      }
      
      for (const key in n) {
        if (key === 'loc' || key === 'range' || key === 'leadingComments' || key === 'trailingComments') {
          continue;
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
    
    return checkNode(node);
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
   * Helper: Check if function returns another function
   */
  private returnsFunction(body: any): boolean {
    if (!body || !body.body) return false;
    
    return body.body.some((stmt: any) => 
      t.isReturnStatement(stmt) && t.isFunction(stmt.argument)
    );
  }

  /**
   * Helper: Check if uses outer scope variables
   */
  private usesOuterScopeVariables(node: any, scope: any): boolean {
    // Simplified check - would need more sophisticated scope analysis
    return true; // Assume closures for nested functions
  }

  /**
   * Helper: Check for recursive calls
   */
  private containsRecursiveCall(node: any, functionName: string): boolean {
    const checkNode = (n: any): boolean => {
      if (!n || typeof n !== 'object') return false;
      
      if (t.isCallExpression(n) && t.isIdentifier(n.callee) && n.callee.name === functionName) {
        return true;
      }
      
      for (const key in n) {
        if (key === 'loc' || key === 'range') continue;
        
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
    
    return checkNode(node);
  }

  /**
   * Calculate complexity metrics
   */
  private async calculateComplexity(ast: any): Promise<ComplexityMetrics> {
    let cyclomaticComplexity = 1;
    let cognitiveComplexity = 0;
    let maxDepth = 0;
    let currentDepth = 0;
    let lineCount = 0;

    if (ast.loc) {
      lineCount = ast.loc.end.line - ast.loc.start.line + 1;
    }

    traverse(ast, {
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
      ForStatement() {
        cyclomaticComplexity++;
        cognitiveComplexity += 2;
      },
      WhileStatement() {
        cyclomaticComplexity++;
        cognitiveComplexity += 2;
      },
      DoWhileStatement() {
        cyclomaticComplexity++;
        cognitiveComplexity += 2;
      },
      LogicalExpression(path) {
        if (path.node.operator === '&&' || path.node.operator === '||') {
          cyclomaticComplexity++;
        }
      },
      BlockStatement: {
        enter() {
          currentDepth++;
          maxDepth = Math.max(maxDepth, currentDepth);
        },
        exit() {
          currentDepth--;
        }
      },
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
      
      Program(path) {
        path.node.body.forEach((node: any) => {
          if (t.isVariableDeclaration(node)) {
            node.declarations.forEach((decl: any) => {
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
}