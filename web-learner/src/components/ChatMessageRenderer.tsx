'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils';
import { StaticCodeBlock } from './StaticCodeBlock';
import { SectionLinkTag } from './SectionLinkTag';
import { useLearningStore } from '@/store/learningStore';
import type { SectionLink } from '@/types';

// Import KaTeX CSS for math rendering
import 'katex/dist/katex.min.css';

interface ChatMessageRendererProps {
  content: string;
  linkedSections?: SectionLink[];
  onSectionClick?: (sectionId: string) => void;
  className?: string;
}

export function ChatMessageRenderer({
  content,
  linkedSections,
  onSectionClick,
  className,
}: ChatMessageRendererProps) {
  const plugins = useMemo(() => [remarkGfm, remarkMath], []);
  const rehypePlugins = useMemo(() => [rehypeKatex], []);
  const loadSection = useLearningStore((state) => state.loadSection);
  
  const handleSectionClick = (sectionId: string) => {
    loadSection(sectionId);
    onSectionClick?.(sectionId);
  };

  return (
    <>
      <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
        <ReactMarkdown
          remarkPlugins={plugins}
          rehypePlugins={rehypePlugins}
          components={{
            p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              const codeContent = String(children).replace(/\n$/, '');

              if (match) {
                return (
                  <StaticCodeBlock
                    language={match[1]}
                    code={codeContent}
                  />
                );
              }
              
              return (
                <code 
                  className="bg-muted text-muted-foreground font-mono px-1.5 py-1 rounded-md text-xs" 
                  {...props}
                >
                  {children}
                </code>
              );
            },
            h1: ({ children }) => <h1 className="font-bold mt-4 mb-2 text-xl">{children}</h1>,
            h2: ({ children }) => <h2 className="font-semibold mt-3 mb-2 text-lg">{children}</h2>,
            h3: ({ children }) => <h3 className="font-semibold mt-3 mb-2 text-base">{children}</h3>,
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            ),
            table: ({ children }) => (
              <div className="my-4 overflow-hidden rounded-lg border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-0">{children}</table>
                </div>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
            tr: ({ children }) => <tr className="border-b border-border hover:bg-muted/50 last:border-b-0">{children}</tr>,
            th: ({ children }) => <th className="text-left font-semibold p-1 text-xs border-r border-border last:border-r-0 min-w-0">{children}</th>,
            td: ({ children }) => <td className="p-1 text-xs border-r border-border last:border-r-0 min-w-0 break-words">{children}</td>,
            blockquote: ({ children }) => <blockquote className="my-4 pl-3 border-l-4 border-primary bg-muted/50 italic py-1">{children}</blockquote>,
            ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>,
            li: ({ children }) => <li className="pl-1">{children}</li>,
            hr: () => <hr className="my-4 border-border" />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      
      {linkedSections && linkedSections.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">相关知识点：</p>
          <div className="flex flex-wrap gap-2">
            {linkedSections
              .filter((link) => {
                const displayScore = link.fusedScore ?? link.relevanceScore;
                return displayScore !== undefined && displayScore > 0.2;
              })
              .map((link) => (
              <SectionLinkTag
                key={link.sectionId}
                link={link}
                onClick={handleSectionClick}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}