'use client';

import React, { useEffect, useState } from 'react';

interface SyntaxHighlighterProps {
  code: string;
  language?: string;
  className?: string;
}

// Basic syntax highlighting using regex patterns
const languagePatterns = {
  javascript: {
    keywords: /\b(const|let|var|function|return|if|else|for|while|class|extends|import|export|async|await|try|catch|finally)\b/g,
    strings: /(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    numbers: /\b\d+(\.\d+)?\b/g,
    functions: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
  },
  typescript: {
    keywords: /\b(const|let|var|function|return|if|else|for|while|class|extends|import|export|async|await|try|catch|finally|interface|type|enum|namespace|declare|readonly|private|public|protected)\b/g,
    strings: /(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    numbers: /\b\d+(\.\d+)?\b/g,
    types: /\b(string|number|boolean|void|any|unknown|never|object|Array)\b/g,
    functions: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
  },
  python: {
    keywords: /\b(def|class|import|from|if|else|elif|for|while|try|except|finally|with|as|lambda|return|yield|break|continue|pass|True|False|None)\b/g,
    strings: /(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
    comments: /(#.*$)/gm,
    numbers: /\b\d+(\.\d+)?\b/g,
    functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,
  },
  css: {
    keywords: /\b(html|body|div|span|class|id|@media|@import|@keyframes)\b/g,
    properties: /\b(color|background|margin|padding|width|height|display|position|top|left|right|bottom|font-size|font-family|border|border-radius)\b/g,
    values: /\b(red|blue|green|yellow|black|white|solid|dashed|none|block|inline|flex|grid|absolute|relative|fixed)\b/g,
    strings: /(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
    comments: /(\/\*[\s\S]*?\*\/)/gm,
  },
  html: {
    tags: /\b(\/?[a-zA-Z][a-zA-Z0-9-]*)/g,
    attributes: /\b([a-zA-Z-]+)(?==["'])/g,
    strings: /(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
    comments: /(\u003c!--[\s\S]*?--\u003e)/gm,
  },
};

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
};

const tokenTypeToClassName: Record<string, string> = {
  keywords: "text-blue-600 dark:text-blue-400 font-semibold",
  strings: "text-green-600 dark:text-green-400",
  comments: "text-gray-500 dark:text-gray-400 italic",
  numbers: "text-purple-600 dark:text-purple-400",
  functions: "text-yellow-600 dark:text-yellow-400",
  types: "text-cyan-600 dark:text-cyan-400",
  tags: "text-blue-600 dark:text-blue-400",
  attributes: "text-red-600 dark:text-red-400",
  properties: "text-indigo-600 dark:text-indigo-400",
  values: "text-teal-600 dark:text-teal-400",
};

interface Token {
  type: string;
  content: string;
  index: number;
}

function highlightCode(code: string, language: string): string {
  const patterns = languagePatterns[language as keyof typeof languagePatterns];
  if (!patterns) return escapeHtml(code);

  const tokens: Token[] = [];

  // 1. Find all matches and create tokens
  for (const [type, pattern] of Object.entries(patterns)) {
    for (const match of code.matchAll(pattern)) {
      tokens.push({
        type,
        content: match[0],
        index: match.index!,
      });
    }
  }

  // 2. Sort tokens by their starting index
  tokens.sort((a, b) => a.index - b.index);

  // 3. Filter out overlapping tokens, keeping the longest one
  const filteredTokens: Token[] = [];
  let lastIndex = -1;
  for (const token of tokens) {
    if (token.index >= lastIndex) {
      filteredTokens.push(token);
      lastIndex = token.index + token.content.length;
    }
  }

  // 4. Build the final HTML string
  let result = '';
  let currentIndex = 0;
  for (const token of filteredTokens) {
    // Add the plain text before the token
    if (token.index > currentIndex) {
      result += escapeHtml(code.substring(currentIndex, token.index));
    }
    // Add the highlighted token
    const className = tokenTypeToClassName[token.type] || '';
    result += `<span class="${className}">${escapeHtml(token.content)}</span>`;
    currentIndex = token.index + token.content.length;
  }

  // Add any remaining plain text
  if (currentIndex < code.length) {
    result += escapeHtml(code.substring(currentIndex));
  }

  return result;
}

export function SyntaxHighlighter({ code, language = 'text', className }: SyntaxHighlighterProps) {
  const [highlightedCode, setHighlightedCode] = useState('');

  useEffect(() => {
    const highlighted = highlightCode(code, language);
    setHighlightedCode(highlighted);
  }, [code, language]);

  return (
    <pre className={`${className} whitespace-pre-wrap`}>
      <code 
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
        className="text-sm font-mono"
      />
    </pre>
  );
}

// Simple code block component with language detection
export function CodeBlock({ code, language, className }: SyntaxHighlighterProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLanguage = language || 'text';

  return (
    <div className={`code-block ${className || ''}`}>
      <div className="code-header">
        <span className="code-language">{displayLanguage}</span>
        <button 
          className="copy-button"
          onClick={handleCopy}
          title="Copy code"
        >
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          )}
        </button>
      </div>
      <div className="code-content">
        <SyntaxHighlighter code={code} language={language} />
      </div>
    </div>
  );
}