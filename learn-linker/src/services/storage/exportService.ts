/**
 * Export Service - Import/Export functionality for code snippets
 * 
 * This service handles exporting snippets to various formats (JSON, Markdown, HTML)
 * and importing from external files.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { 
  CodeSnippet, 
  SnippetCollection,
  ExportOptions,
  ImportResult
} from '../../types/snippet';
import { Logger } from '../../utils/logger';

/**
 * Export/Import service for code snippets
 */
export class ExportService {
  private static instance: ExportService;
  private logger: Logger;
  
  private constructor() {
    this.logger = Logger.getInstance();
  }
  
  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }
  
  // ==================== Export Operations ====================
  
  /**
   * Export snippets to JSON format
   */
  public async exportToJSON(
    snippets: CodeSnippet[], 
    collections?: SnippetCollection[],
    options?: Partial<ExportOptions>
  ): Promise<string> {
    try {
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        metadata: {
          totalSnippets: snippets.length,
          totalCollections: collections?.length || 0,
          includeExplanations: options?.includeExplanations ?? true,
          includeUserNotes: options?.includeUserNotes ?? true,
          includeMetadata: options?.includeMetadata ?? true
        },
        snippets: this.prepareSnippetsForExport(snippets, options),
        collections: collections || []
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      this.logger.error('Failed to export to JSON', error);
      throw error;
    }
  }
  
  /**
   * Export snippets to Markdown format
   */
  public async exportToMarkdown(
    snippets: CodeSnippet[],
    options?: Partial<ExportOptions>
  ): Promise<string> {
    try {
      let markdown = '# Code Learning Collection\n\n';
      markdown += `> Exported on ${new Date().toLocaleDateString()}\n\n`;
      markdown += `Total snippets: ${snippets.length}\n\n`;
      markdown += '---\n\n';
      
      // Sort snippets if requested
      const sorted = this.sortSnippets(snippets, options?.sortBy);
      
      // Group by category if requested
      if (options?.groupByCategory) {
        const grouped = this.groupSnippetsByCategory(sorted);
        
        for (const [category, categorySnippets] of Object.entries(grouped)) {
          markdown += `## ${category || 'Uncategorized'}\n\n`;
          
          for (const snippet of categorySnippets) {
            markdown += this.snippetToMarkdown(snippet, options);
          }
        }
      } else {
        for (const snippet of sorted) {
          markdown += this.snippetToMarkdown(snippet, options);
        }
      }
      
      return markdown;
    } catch (error) {
      this.logger.error('Failed to export to Markdown', error);
      throw error;
    }
  }
  
  /**
   * Export snippets to HTML format
   */
  public async exportToHTML(
    snippets: CodeSnippet[],
    options?: Partial<ExportOptions>
  ): Promise<string> {
    try {
      const content = await this.exportToMarkdown(snippets, options);
      
      // Simple HTML template with syntax highlighting support
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Learning Collection</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .snippet {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .snippet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    .language-badge {
      background: #007acc;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .difficulty-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .difficulty-easy { background: #4caf50; color: white; }
    .difficulty-medium { background: #ff9800; color: white; }
    .difficulty-hard { background: #f44336; color: white; }
    .tags {
      margin: 10px 0;
    }
    .tag {
      display: inline-block;
      background: #e0e0e0;
      padding: 2px 8px;
      margin-right: 5px;
      border-radius: 12px;
      font-size: 12px;
    }
    pre {
      background: #282c34;
      border-radius: 6px;
      padding: 15px;
      overflow-x: auto;
    }
    code {
      font-family: 'Courier New', Courier, monospace;
    }
    .explanation {
      background: #f0f7ff;
      border-left: 4px solid #2196f3;
      padding: 15px;
      margin: 15px 0;
    }
    .user-notes {
      background: #fff9c4;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <h1>Code Learning Collection</h1>
  <p>Exported on ${new Date().toLocaleDateString()}</p>
  <p>Total snippets: ${snippets.length}</p>
  <hr>
  ${this.snippetsToHTMLContent(snippets, options)}
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script>hljs.highlightAll();</script>
</body>
</html>`;
      
      return html;
    } catch (error) {
      this.logger.error('Failed to export to HTML', error);
      throw error;
    }
  }
  
  /**
   * Save export to file
   */
  public async saveToFile(content: string, format: 'json' | 'markdown' | 'html'): Promise<string | undefined> {
    const extension = format === 'markdown' ? 'md' : format;
    const defaultFileName = `code-snippets-${Date.now()}.${extension}`;
    
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(defaultFileName),
      filters: {
        'Export Files': [extension],
        'All Files': ['*']
      }
    });
    
    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      vscode.window.showInformationMessage(`Exported successfully to ${uri.fsPath}`);
      return uri.fsPath;
    }
    
    return undefined;
  }
  
  // ==================== Import Operations ====================
  
  /**
   * Import snippets from JSON file
   */
  public async importFromJSON(filePath: string): Promise<ImportResult> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Validate import data structure
      if (!data.snippets || !Array.isArray(data.snippets)) {
        throw new Error('Invalid import file: missing snippets array');
      }
      
      const result: ImportResult = {
        success: true,
        imported: 0,
        skipped: 0,
        errors: [],
        snippetIds: []
      };
      
      // Process each snippet
      for (const snippet of data.snippets) {
        try {
          // Validate required fields
          if (!snippet.id || !snippet.code || !snippet.language) {
            result.errors.push(`Invalid snippet: missing required fields`);
            result.skipped++;
            continue;
          }
          
          // Convert date strings back to Date objects
          if (snippet.createdAt) snippet.createdAt = new Date(snippet.createdAt);
          if (snippet.updatedAt) snippet.updatedAt = new Date(snippet.updatedAt);
          if (snippet.lastReviewDate) snippet.lastReviewDate = new Date(snippet.lastReviewDate);
          if (snippet.nextReviewDate) snippet.nextReviewDate = new Date(snippet.nextReviewDate);
          
          result.snippetIds.push(snippet.id);
          result.imported++;
        } catch (error) {
          result.errors.push(`Failed to process snippet: ${error}`);
          result.skipped++;
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error('Failed to import from JSON', error);
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [`Import failed: ${error}`],
        snippetIds: []
      };
    }
  }
  
  /**
   * Import from file with dialog
   */
  public async importFromFile(): Promise<ImportResult | undefined> {
    const uri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });
    
    if (uri && uri[0]) {
      const result = await this.importFromJSON(uri[0].fsPath);
      
      if (result.success) {
        vscode.window.showInformationMessage(
          `Import complete: ${result.imported} imported, ${result.skipped} skipped`
        );
      } else {
        vscode.window.showErrorMessage(
          `Import failed: ${result.errors.join(', ')}`
        );
      }
      
      return result;
    }
    
    return undefined;
  }
  
  // ==================== Helper Methods ====================
  
  /**
   * Prepare snippets for export (filter fields based on options)
   */
  private prepareSnippetsForExport(
    snippets: CodeSnippet[], 
    options?: Partial<ExportOptions>
  ): any[] {
    return snippets.map(snippet => {
      const exported: any = {
        id: snippet.id,
        code: snippet.code,
        language: snippet.language,
        difficulty: snippet.difficulty,
        tags: snippet.tags,
        category: snippet.category,
        createdAt: snippet.createdAt,
        updatedAt: snippet.updatedAt
      };
      
      if (options?.includeExplanations !== false) {
        exported.explanation = snippet.explanation;
        exported.keyPoints = snippet.keyPoints;
      }
      
      if (options?.includeUserNotes !== false) {
        exported.userNotes = snippet.userNotes;
        exported.relatedConcepts = snippet.relatedConcepts;
      }
      
      if (options?.includeMetadata !== false) {
        exported.filePath = snippet.filePath;
        exported.fileName = snippet.fileName;
        exported.lineRange = snippet.lineRange;
        exported.reviewCount = snippet.reviewCount;
        exported.mastered = snippet.mastered;
        exported.lastReviewDate = snippet.lastReviewDate;
        exported.nextReviewDate = snippet.nextReviewDate;
      }
      
      return exported;
    });
  }
  
  /**
   * Convert snippet to Markdown format
   */
  private snippetToMarkdown(snippet: CodeSnippet, options?: Partial<ExportOptions>): string {
    let md = `### Snippet: ${snippet.id}\n\n`;
    
    // Metadata
    md += `**Language:** ${snippet.language} | `;
    md += `**Difficulty:** ${snippet.difficulty} | `;
    md += `**Created:** ${new Date(snippet.createdAt).toLocaleDateString()}\n\n`;
    
    // Tags
    if (snippet.tags.length > 0) {
      md += `**Tags:** ${snippet.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
    }
    
    // Code
    md += `\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n\n`;
    
    // Explanation
    if (options?.includeExplanations !== false && snippet.explanation) {
      md += `#### Explanation\n\n${snippet.explanation}\n\n`;
    }
    
    // Key points
    if (options?.includeExplanations !== false && snippet.keyPoints?.length) {
      md += `#### Key Points\n\n`;
      snippet.keyPoints.forEach(point => {
        md += `- ${point}\n`;
      });
      md += '\n';
    }
    
    // User notes
    if (options?.includeUserNotes !== false && snippet.userNotes) {
      md += `#### Notes\n\n${snippet.userNotes}\n\n`;
    }
    
    md += '---\n\n';
    return md;
  }
  
  /**
   * Convert snippets to HTML content
   */
  private snippetsToHTMLContent(snippets: CodeSnippet[], options?: Partial<ExportOptions>): string {
    return snippets.map(snippet => `
      <div class="snippet">
        <div class="snippet-header">
          <div>
            <span class="language-badge">${snippet.language}</span>
            <span class="difficulty-badge difficulty-${snippet.difficulty}">${snippet.difficulty}</span>
          </div>
          <small>${new Date(snippet.createdAt).toLocaleDateString()}</small>
        </div>
        
        ${snippet.tags.length > 0 ? `
        <div class="tags">
          ${snippet.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        ` : ''}
        
        <pre><code class="language-${snippet.language}">${this.escapeHtml(snippet.code)}</code></pre>
        
        ${options?.includeExplanations !== false && snippet.explanation ? `
        <div class="explanation">
          <h4>Explanation</h4>
          <p>${snippet.explanation}</p>
        </div>
        ` : ''}
        
        ${options?.includeUserNotes !== false && snippet.userNotes ? `
        <div class="user-notes">
          <h4>Notes</h4>
          <p>${snippet.userNotes}</p>
        </div>
        ` : ''}
      </div>
    `).join('\n');
  }
  
  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
  
  /**
   * Sort snippets based on criteria
   */
  private sortSnippets(
    snippets: CodeSnippet[], 
    sortBy?: 'date' | 'difficulty' | 'language'
  ): CodeSnippet[] {
    const sorted = [...snippets];
    
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'difficulty':
        const order = { easy: 1, medium: 2, hard: 3 };
        sorted.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
        break;
      case 'language':
        sorted.sort((a, b) => a.language.localeCompare(b.language));
        break;
    }
    
    return sorted;
  }
  
  /**
   * Group snippets by category
   */
  private groupSnippetsByCategory(snippets: CodeSnippet[]): Record<string, CodeSnippet[]> {
    const grouped: Record<string, CodeSnippet[]> = {};
    
    for (const snippet of snippets) {
      const category = snippet.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(snippet);
    }
    
    return grouped;
  }
}