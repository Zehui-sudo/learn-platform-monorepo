/**
 * Explanation Panel - Webview for displaying code explanations
 * 
 * This panel provides a streaming display for AI-generated code explanations
 * with support for markdown rendering and code highlighting.
 */

import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';

export class ExplanationPanel {
  private static currentPanel: ExplanationPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly logger: Logger;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.logger = Logger.getInstance();

    // Set the webview's initial html content
    this.panel.webview.html = this.getHtmlContent(this.panel.webview, extensionUri);

    // Listen for when the panel is disposed
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'ready':
            this.logger.debug('Webview ready');
            break;
          case 'error':
            this.logger.error('Webview error:', message.text);
            break;
          case 'copy':
            vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage('Copied to clipboard!');
            break;
        }
      },
      null,
      this.disposables
    );
  }

  public static async show(
    context: vscode.ExtensionContext,
    codeInfo?: {
      code: string;
      language?: string;
      fileName?: string;
      lineRange?: { start: number; end: number } | string;
    }
  ): Promise<ExplanationPanel> {
    const column = vscode.ViewColumn.Beside;

    // If we already have a panel, show it
    if (ExplanationPanel.currentPanel) {
      ExplanationPanel.currentPanel.panel.reveal(column);
      // Clear previous content
      ExplanationPanel.currentPanel.panel.webview.postMessage({ type: 'clear' });
    } else {
      // Create a new panel
      const panel = vscode.window.createWebviewPanel(
        'learnLinkerExplanation',
        'Code Explanation',
        column,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [context.extensionUri]
        }
      );

      // Set icon
      panel.iconPath = {
        light: vscode.Uri.joinPath(context.extensionUri, 'media', 'icon-light.svg'),
        dark: vscode.Uri.joinPath(context.extensionUri, 'media', 'icon-dark.svg')
      };

      ExplanationPanel.currentPanel = new ExplanationPanel(panel, context.extensionUri);
    }

    // Send code info if provided
    if (codeInfo) {
      ExplanationPanel.currentPanel.panel.webview.postMessage({
        type: 'codeInfo',
        ...codeInfo
      });
    }

    return ExplanationPanel.currentPanel;
  }

  public async appendContent(content: string) {
    this.panel.webview.postMessage({
      type: 'appendContent',
      content
    });
  }

  public async streamContent(stream: ReadableStream<string>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    // Send start signal
    this.panel.webview.postMessage({ type: 'streamStart' });

    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Handle both string and Uint8Array
        const chunk = typeof value === 'string' ? value : decoder.decode(value, { stream: true });
        buffer += chunk;

        // Send chunk to webview
        this.panel.webview.postMessage({
          type: 'streamChunk',
          content: chunk
        });

        // Small delay to ensure smooth streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Send completion signal
      this.panel.webview.postMessage({ type: 'streamEnd' });
      
      this.logger.info('Stream completed successfully');
      return buffer;
    } catch (error) {
      this.logger.error('Stream error:', error);
      this.panel.webview.postMessage({
        type: 'streamError',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error; // Re-throw to handle in caller
    }
  }

  public dispose() {
    ExplanationPanel.currentPanel = undefined;

    // Clean up resources
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    // Use VS Code's theme colors
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css')
    );

    // Use marked library from CDN for proper markdown parsing
    const markedCdn = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    const highlightCdn = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js';
    const highlightCssCdn = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/vs2015.min.css';

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; script-src https://cdn.jsdelivr.net 'unsafe-inline'; img-src ${webview.cspSource} https:;">
      <title>Code Explanation</title>
      
      <!-- External Libraries -->
      <link rel="stylesheet" href="${highlightCssCdn}">
      <script src="${markedCdn}"></script>
      <script src="${highlightCdn}"></script>
      
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
          font-weight: var(--vscode-font-weight);
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
          line-height: 1.6;
          padding: 20px;
          max-width: 900px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--vscode-widget-border);
        }

        .code-info {
          background: var(--vscode-editor-inactiveSelectionBackground);
          border: 1px solid var(--vscode-widget-border);
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 20px;
          font-family: var(--vscode-editor-font-family);
        }

        .code-info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .code-info-meta {
          display: flex;
          gap: 15px;
          font-size: 0.9em;
          color: var(--vscode-descriptionForeground);
        }

        .code-snippet {
          background: var(--vscode-textCodeBlock-background);
          border: 1px solid var(--vscode-widget-border);
          border-radius: 4px;
          padding: 12px;
          overflow-x: auto;
          font-family: var(--vscode-editor-font-family);
          font-size: var(--vscode-editor-font-size);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .explanation {
          margin-top: 20px;
          min-height: 100px;
        }

        .explanation-content {
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.8;
        }

        .streaming-indicator {
          display: none;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          color: var(--vscode-descriptionForeground);
        }

        .streaming-indicator.active {
          display: flex;
        }

        .cursor {
          display: inline-block;
          width: 2px;
          height: 1.2em;
          background: var(--vscode-editor-cursor-foreground);
          animation: blink 1s infinite;
          margin-left: 2px;
          vertical-align: text-bottom;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .dot-loading {
          display: inline-block;
        }

        .dot-loading::after {
          content: '';
          animation: dots 1.5s infinite;
        }

        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }

        /* Markdown styles */
        .explanation h1, .explanation h2, .explanation h3, .explanation h4 {
          margin-top: 24px;
          margin-bottom: 12px;
          font-weight: 600;
          line-height: 1.25;
        }

        .explanation h1 { 
          font-size: 1.8em; 
          border-bottom: 1px solid var(--vscode-widget-border);
          padding-bottom: 8px;
        }
        .explanation h2 { font-size: 1.5em; }
        .explanation h3 { font-size: 1.25em; }
        .explanation h4 { font-size: 1.1em; }

        .explanation p {
          margin-bottom: 12px;
          line-height: 1.6;
        }

        .explanation code:not(.hljs) {
          background: var(--vscode-textCodeBlock-background);
          padding: 2px 6px;
          border-radius: 3px;
          font-family: var(--vscode-editor-font-family);
          font-size: 0.9em;
          color: var(--vscode-textPreformat-foreground);
        }

        .explanation pre {
          background: var(--vscode-textCodeBlock-background);
          border: 1px solid var(--vscode-widget-border);
          border-radius: 6px;
          padding: 16px;
          margin: 16px 0;
          overflow-x: auto;
        }

        .explanation pre code {
          background: none;
          padding: 0;
          font-size: 0.9em;
          line-height: 1.5;
        }

        .explanation ul, .explanation ol {
          margin-left: 24px;
          margin-bottom: 12px;
        }

        .explanation li {
          margin-bottom: 6px;
          line-height: 1.6;
        }

        .explanation blockquote {
          border-left: 4px solid var(--vscode-textBlockQuote-border);
          padding-left: 16px;
          margin: 16px 0;
          color: var(--vscode-textBlockQuote-foreground);
          font-style: italic;
        }

        .explanation strong {
          font-weight: 600;
        }

        .explanation em {
          font-style: italic;
        }

        .explanation hr {
          border: none;
          border-top: 1px solid var(--vscode-widget-border);
          margin: 20px 0;
        }

        .explanation table {
          border-collapse: collapse;
          margin: 16px 0;
          width: 100%;
        }

        .explanation th,
        .explanation td {
          border: 1px solid var(--vscode-widget-border);
          padding: 8px 12px;
          text-align: left;
        }

        .explanation th {
          background: var(--vscode-editor-inactiveSelectionBackground);
          font-weight: 600;
        }

        /* Highlight.js overrides */
        .hljs {
          background: transparent !important;
          padding: 0 !important;
        }

        .actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--vscode-widget-border);
        }

        button {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 6px 14px;
          border-radius: 4px;
          cursor: pointer;
          font-size: var(--vscode-font-size);
        }

        button:hover {
          background: var(--vscode-button-hoverBackground);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          background: var(--vscode-inputValidation-errorBackground);
          border: 1px solid var(--vscode-inputValidation-errorBorder);
          color: var(--vscode-errorForeground);
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Code Explanation</h2>
      </div>

      <div id="codeInfo" class="code-info" style="display: none;">
        <div class="code-info-header">
          <div class="code-info-meta">
            <span id="fileName"></span>
            <span id="language"></span>
            <span id="lines"></span>
          </div>
          <button onclick="copyCode()">Copy Code</button>
        </div>
        <pre class="code-snippet" id="codeSnippet"></pre>
      </div>

      <div class="explanation">
        <div id="explanationContent" class="explanation-content"></div>
        <span id="cursor" class="cursor" style="display: none;"></span>
      </div>

      <div id="streamingIndicator" class="streaming-indicator">
        <span>AI is thinking</span>
        <span class="dot-loading"></span>
      </div>

      <div id="errorContainer"></div>

      <div class="actions" id="actions" style="display: none;">
        <button id="copyBtn" onclick="copyExplanation()">Copy Explanation</button>
        <button id="clearBtn" onclick="clearContent()">Clear</button>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        const explanationContent = document.getElementById('explanationContent');
        const cursor = document.getElementById('cursor');
        const streamingIndicator = document.getElementById('streamingIndicator');
        const errorContainer = document.getElementById('errorContainer');
        const actions = document.getElementById('actions');
        const codeInfo = document.getElementById('codeInfo');
        const codeSnippet = document.getElementById('codeSnippet');
        const fileName = document.getElementById('fileName');
        const language = document.getElementById('language');
        const lines = document.getElementById('lines');

        let currentExplanation = '';
        let currentCode = '';

        // Configure marked options
        marked.setOptions({
          highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
              try {
                return hljs.highlight(code, { language: lang }).value;
              } catch (err) {
                console.error('Highlight error:', err);
              }
            }
            return hljs.highlightAuto(code).value;
          },
          breaks: true,
          gfm: true,
          sanitize: false
        });

        // Send ready message
        vscode.postMessage({ command: 'ready' });

        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;

          switch (message.type) {
            case 'clear':
              clearContent();
              break;

            case 'codeInfo':
              displayCodeInfo(message);
              break;

            case 'streamStart':
              startStreaming();
              break;

            case 'streamChunk':
              appendChunk(message.content);
              break;

            case 'streamEnd':
              endStreaming();
              break;

            case 'streamError':
              showError(message.message);
              break;
          }
        });

        function displayCodeInfo(info) {
          currentCode = info.code;
          codeSnippet.textContent = info.code;
          
          if (info.fileName) {
            fileName.textContent = info.fileName;
            fileName.style.display = 'inline';
          }
          
          if (info.language) {
            language.textContent = \`Language: \${info.language}\`;
            language.style.display = 'inline';
          }
          
          if (info.lineRange) {
            lines.textContent = \`Lines: \${info.lineRange.start}-\${info.lineRange.end}\`;
            lines.style.display = 'inline';
          }
          
          codeInfo.style.display = 'block';
        }

        function startStreaming() {
          currentExplanation = '';
          explanationContent.textContent = '';
          errorContainer.innerHTML = '';
          streamingIndicator.classList.add('active');
          cursor.style.display = 'inline';
          actions.style.display = 'none';
        }

        function appendChunk(chunk) {
          currentExplanation += chunk;
          // For streaming, show raw text with cursor
          explanationContent.textContent = currentExplanation;
          
          // Auto scroll to bottom
          window.scrollTo(0, document.body.scrollHeight);
        }

        function endStreaming() {
          streamingIndicator.classList.remove('active');
          cursor.style.display = 'none';
          actions.style.display = 'flex';
          
          // Process markdown formatting
          formatContent();
        }

        function showError(message) {
          streamingIndicator.classList.remove('active');
          cursor.style.display = 'none';
          
          errorContainer.innerHTML = \`
            <div class="error-message">
              <strong>Error:</strong> \${message}
            </div>
          \`;
        }

        function formatContent() {
          // Use marked to parse markdown
          try {
            const html = marked.parse(currentExplanation);
            explanationContent.innerHTML = html;
            
            // Re-run highlighting on dynamically added code blocks
            document.querySelectorAll('.explanation pre code').forEach((block) => {
              hljs.highlightElement(block);
            });
          } catch (err) {
            console.error('Markdown parsing error:', err);
            // Fallback to simple text display
            explanationContent.textContent = currentExplanation;
          }
        }

        function copyCode() {
          vscode.postMessage({
            command: 'copy',
            text: currentCode
          });
        }

        function copyExplanation() {
          vscode.postMessage({
            command: 'copy',
            text: currentExplanation
          });
        }

        function clearContent() {
          explanationContent.textContent = '';
          currentExplanation = '';
          errorContainer.innerHTML = '';
          actions.style.display = 'none';
          codeInfo.style.display = 'none';
        }
      </script>
    </body>
    </html>`;
  }
}