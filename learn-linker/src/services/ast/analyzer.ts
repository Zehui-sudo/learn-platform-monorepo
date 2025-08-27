/**
 * Main AST Analyzer
 * 
 * Coordinates language-specific parsers and generates matching features
 */

import * as vscode from 'vscode';
import { JavaScriptParser } from './parsers/javascript';
import { PythonParser } from './parsers/python';
import {
  CodeFeatures,
  MatchingFeatures,
  AnalysisOptions,
  AnalysisResult,
  AnalysisError,
  PatternType,
  CodeContext
} from './types';
import { Logger } from '../../utils/logger';
import * as path from 'path';

export class ASTAnalyzer {
  private static instance: ASTAnalyzer;
  private jsParser: JavaScriptParser;
  private pyParser: PythonParser;
  private logger: Logger;
  
  private constructor() {
    this.jsParser = new JavaScriptParser();
    this.pyParser = new PythonParser();
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ASTAnalyzer {
    if (!ASTAnalyzer.instance) {
      ASTAnalyzer.instance = new ASTAnalyzer();
    }
    return ASTAnalyzer.instance;
  }

  /**
   * Analyze code and extract features
   */
  async analyze(
    code: string,
    language?: string,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const errors: AnalysisError[] = [];
    const warnings: string[] = [];

    try {
      // Detect language if not provided
      if (!language) {
        language = this.detectLanguage(code);
        warnings.push(`Language not specified, detected as: ${language}`);
      }

      // Normalize language string
      language = this.normalizeLanguage(language);

      // Parse code based on language
      let features: CodeFeatures;
      
      switch (language) {
        case 'javascript':
        case 'typescript':
          features = await this.analyzeWithTimeout(
            () => this.jsParser.parse(code, language === 'typescript'),
            options.timeout || 5000
          );
          break;
          
        case 'python':
          features = await this.analyzeWithTimeout(
            () => this.pyParser.parse(code),
            options.timeout || 5000
          );
          break;
          
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      // Add file context if available
      if (options.includeContext) {
        features.context = this.enrichContext(features.context, language);
      }

      // Generate matching features for API transmission
      const matchingFeatures = this.generateMatchingFeatures(features, language);

      const analysisTime = Date.now() - startTime;

      this.logger.info('Code analysis completed', {
        language,
        analysisTime,
        patterns: features.patterns.length,
        apiCalls: features.apiCalls.length
      });

      return {
        features,
        matchingFeatures,
        errors,
        warnings,
        performance: {
          parseTime: analysisTime * 0.8, // Approximate
          analysisTime: analysisTime * 0.2,
          totalTime: analysisTime
        }
      };

    } catch (error) {
      this.logger.error('Code analysis failed', error);
      
      errors.push({
        type: 'analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return minimal features on error
      return {
        features: this.getEmptyFeatures(language || 'javascript'),
        matchingFeatures: this.getMinimalMatchingFeatures(language || 'javascript'),
        errors,
        warnings
      };
    }
  }

  /**
   * Generate matching features for API transmission
   */
  generateMatchingFeatures(features: CodeFeatures, language: string): MatchingFeatures {
    // Extract active syntax features
    const syntaxFlags: string[] = [];
    Object.entries(features.syntax).forEach(([key, value]) => {
      if (value === true) {
        syntaxFlags.push(key.replace('has', '').toLowerCase());
      }
    });

    // Extract pattern types
    const patterns = features.patterns.map(p => p.type);

    // Extract API signatures (simplified)
    const apiSignatures = features.apiCalls.map(call => {
      if (call.object) {
        return `${call.object}.${call.method}`;
      }
      return call.method;
    });

    // Determine complexity level
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (features.complexity.cyclomaticComplexity > 10 || 
        features.complexity.cognitiveComplexity > 20) {
      complexity = 'high';
    } else if (features.complexity.cyclomaticComplexity > 5 || 
               features.complexity.cognitiveComplexity > 10) {
      complexity = 'medium';
    }

    // Generate context hints
    const contextHints = this.generateContextHints(features, apiSignatures);

    return {
      language,
      syntaxFlags,
      patterns,
      apiSignatures: [...new Set(apiSignatures)], // Remove duplicates
      complexity,
      contextHints
    };
  }

  /**
   * Generate context hints from features
   */
  private generateContextHints(features: CodeFeatures, apiSignatures: string[]) {
    const hints: MatchingFeatures['contextHints'] = {};

    // Check for async code
    if (features.syntax.hasAsync || features.syntax.hasPromise) {
      hints.hasAsync = true;
    }

    // Check for error handling
    if (features.syntax.hasTryCatch || 
        features.patterns.some(p => p.type === PatternType.ERROR_HANDLING)) {
      hints.hasErrorHandling = true;
    }

    // Check for DOM usage
    const domAPIs = ['document', 'window', 'querySelector', 'getElementById', 'addEventListener'];
    if (apiSignatures.some(api => domAPIs.some(dom => api.includes(dom)))) {
      hints.usesDOM = true;
    }

    // Check for Node.js usage
    const nodeModules = ['fs', 'path', 'http', 'https', 'crypto', 'os', 'child_process'];
    if (features.context.imports?.some(imp => nodeModules.includes(imp.source))) {
      hints.usesNode = true;
    }

    // Check for React usage
    const reactIndicators = ['useState', 'useEffect', 'Component', 'render', 'jsx'];
    if (apiSignatures.some(api => reactIndicators.some(react => api.includes(react))) ||
        features.context.imports?.some(imp => imp.source.includes('react'))) {
      hints.usesReact = true;
    }

    return hints;
  }

  /**
   * Analyze with timeout
   */
  private async analyzeWithTimeout<T>(
    analyzeFunc: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      analyzeFunc(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Analysis timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Detect language from code
   */
  private detectLanguage(code: string): string {
    // Simple heuristics for language detection
    
    // Python indicators
    if (code.includes('def ') || code.includes('import ') || code.includes('print(')) {
      return 'python';
    }
    
    // TypeScript indicators
    if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) {
      return 'typescript';
    }
    
    // JavaScript (default for JS-like syntax)
    if (code.includes('function ') || code.includes('const ') || code.includes('=>')) {
      return 'javascript';
    }
    
    // Default
    return 'javascript';
  }

  /**
   * Normalize language string
   */
  private normalizeLanguage(language: string): string {
    const normalized = language.toLowerCase();
    
    // Map common variations
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'python3': 'python'
    };
    
    return languageMap[normalized] || normalized;
  }

  /**
   * Enrich context with additional information
   */
  private enrichContext(context: CodeContext, language: string): CodeContext {
    // Get active editor information if available
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
      context.fileName = path.basename(document.fileName);
      context.fileType = path.extname(document.fileName);
    }

    return context;
  }

  /**
   * Get empty features structure
   */
  private getEmptyFeatures(language: string): CodeFeatures {
    return {
      syntax: {},
      patterns: [],
      apiCalls: [],
      complexity: {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        lineCount: 0,
        maxDepth: 0
      },
      context: {
        language: language as any
      }
    };
  }

  /**
   * Get minimal matching features for fallback
   */
  private getMinimalMatchingFeatures(language: string): MatchingFeatures {
    return {
      language,
      syntaxFlags: [],
      patterns: [],
      apiSignatures: [],
      complexity: 'low'
    };
  }

  /**
   * Extract features from the current editor selection
   */
  async analyzeSelection(): Promise<AnalysisResult | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.logger.warn('No active editor');
      return null;
    }

    const selection = editor.selection;
    const code = editor.document.getText(selection);
    
    if (!code) {
      this.logger.warn('No code selected');
      return null;
    }

    const language = editor.document.languageId;
    
    return this.analyze(code, language, {
      includeContext: true,
      includeLocation: true
    });
  }

  /**
   * Analyze entire file
   */
  async analyzeFile(uri?: vscode.Uri): Promise<AnalysisResult | null> {
    let document: vscode.TextDocument;
    
    if (uri) {
      document = await vscode.workspace.openTextDocument(uri);
    } else {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        this.logger.warn('No active editor');
        return null;
      }
      document = editor.document;
    }

    const code = document.getText();
    const language = document.languageId;
    
    return this.analyze(code, language, {
      includeContext: true,
      includeLocation: false
    });
  }
}