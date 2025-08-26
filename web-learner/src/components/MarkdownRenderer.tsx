'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Code } from '@/components/ui/code';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Simple markdown parser - can be enhanced with a proper markdown library
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let currentList: string[] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockContent = '';

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={elements.length} className="my-4 ml-6 list-disc space-y-2">
            {currentList.map((item, i) => (
              <li key={i} className="text-sm">{item}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          elements.push(
            <div key={elements.length} className="my-4">
              <div className="relative">
                {codeBlockLang && (
                  <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                    {codeBlockLang}
                  </Badge>
                )}
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm font-mono">{codeBlockContent}</code>
                </pre>
              </div>
            </div>
          );
          inCodeBlock = false;
          codeBlockContent = '';
          codeBlockLang = '';
        } else {
          // Start of code block
          inCodeBlock = true;
          codeBlockLang = trimmedLine.slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent += line + '\n';
        return;
      }

      // Headers
      if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={elements.length} className="text-2xl font-bold mt-6 mb-4">
            {trimmedLine.slice(2)}
          </h1>
        );
      } else if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={elements.length} className="text-xl font-semibold mt-6 mb-3">
            {trimmedLine.slice(3)}
          </h2>
        );
      } else if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={elements.length} className="text-lg font-semibold mt-4 mb-2">
            {trimmedLine.slice(4)}
          </h3>
        );
      }
      // Lists
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        currentList.push(trimmedLine.slice(2));
      }
      // Bold text
      else if (trimmedLine.includes('**')) {
        flushList();
        const parts = trimmedLine.split('**');
        elements.push(
          <p key={elements.length} className="mb-2 text-sm leading-relaxed">
            {parts.map((part, i) => 
              i % 2 === 1 ? 
                <strong key={i} className="font-semibold">{part}</strong> : 
                part
            )}
          </p>
        );
      }
      // Code inline
      else if (trimmedLine.includes('`')) {
        flushList();
        const parts = trimmedLine.split('`');
        elements.push(
          <p key={elements.length} className="mb-2 text-sm leading-relaxed">
            {parts.map((part, i) => 
              i % 2 === 1 ? 
                <Code key={i} className="text-xs px-1 py-0.5">{part}</Code> : 
                part
            )}
          </p>
        );
      }
      // Regular paragraphs
      else if (trimmedLine) {
        flushList();
        elements.push(
          <p key={elements.length} className="mb-2 text-sm leading-relaxed">
            {trimmedLine}
          </p>
        );
      }
      // Empty lines
      else if (trimmedLine === '' && !inCodeBlock) {
        flushList();
      }
    });

    flushList(); // Flush any remaining list

    return elements;
  };

  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      {renderMarkdown(content)}
    </div>
  );
}