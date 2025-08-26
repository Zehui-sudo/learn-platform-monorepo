'use client';

import { useRef, useEffect } from 'react';
import { useLearningStore } from '@/store/learningStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, BookOpen, CheckCircle2, Star } from 'lucide-react';
import { EnhancedMarkdownRenderer } from './EnhancedMarkdownRenderer';
import { InteractiveCodeBlock } from './InteractiveCodeBlock';
import { useTextSelection } from '@/hooks/useTextSelection';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function ContentDisplay() {
  const currentSection = useLearningStore((state) => state.currentSection);
  const loading = useLearningStore((state) => state.loading);
  const error = useLearningStore((state) => state.error);
  const fontSize = useLearningStore((state) => state.fontSize);
  const userProgress = useLearningStore((state) => state.userProgress);
  const toggleSectionComplete = useLearningStore((state) => state.toggleSectionComplete);
  const toggleSectionFavorite = useLearningStore((state) => state.toggleSectionFavorite);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentSectionIdRef = useRef(currentSection?.id);
  
  // Enable text selection
  useTextSelection(contentRef as React.RefObject<HTMLElement>);

  // Only reset scroll when section changes, not when content updates
  useEffect(() => {
    if (currentSectionIdRef.current !== currentSection?.id) {
      currentSectionIdRef.current = currentSection?.id;
      // Reset scroll position when navigating to a new section
      const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = 0;
      }
    }
  }, [currentSection?.id]);

  if (loading.section) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="space-y-4 w-full max-w-2xl">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-1/4" />
        </div>
      </div>
    );
  }

  if (error.section) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>
            {error.section}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!currentSection) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">选择学习内容</h3>
          <p className="text-sm text-muted-foreground">
            请从左侧导航栏选择一个章节开始学习
          </p>
        </div>
      </div>
    );
  }

  const progress = currentSection ? userProgress[currentSection.id] : undefined;
  const isCompleted = progress?.isCompleted || false;
  const isFavorite = progress?.isFavorite || false;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}

      {/* Content */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div 
          ref={contentRef}
          className="p-6 pt-0 space-y-6 max-w-4xl mx-auto"
          style={{ 
            fontSize: `${fontSize}px`,
            lineHeight: fontSize >= 18 ? 1.8 : 1.6
          }}>
          {currentSection.contentBlocks.map((block, index) => (
            <div key={`block-${currentSection.id}-${index}`}>
              {block.type === 'markdown' && (
                <div className="max-w-none">
                  <EnhancedMarkdownRenderer content={block.content} fontSize={fontSize} />
                </div>
              )}
              
              {block.type === 'code' && (
                <InteractiveCodeBlock
                  key={`${currentSection.id}-${index}`}
                  language={block.language}
                  initialCode={block.code}
                  sectionId={currentSection.id}
                  fontSize={fontSize}
                />
              )}
            </div>
          ))}
          
          {currentSection.contentBlocks.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">内容准备中</h3>
              <p className="text-sm text-muted-foreground">
                这个章节的内容正在精心准备中，敬请期待��
              </p>
            </div>
          )}
          
          {/* Progress Actions */}
          {currentSection.contentBlocks.length > 0 && (
            <div className="mt-12 space-y-4">
              <Separator />
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant={isCompleted ? "default" : "outline"}
                    size="lg"
                    onClick={() => toggleSectionComplete(currentSection.id)}
                    className="w-full sm:w-auto"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {isCompleted ? '已完成学习' : '标记为已完成'}
                  </Button>
                  
                  <Button
                    variant={isFavorite ? "default" : "outline"}
                    size="lg"
                    onClick={() => toggleSectionFavorite(currentSection.id)}
                    className={`w-full sm:w-auto ${isFavorite ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                  >
                    <Star className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                    {isFavorite ? '已收藏' : '添加到收藏'}
                  </Button>
                </div>
                
                {(isCompleted || isFavorite) && (
                  <div className="text-sm text-muted-foreground">
                    {isCompleted && progress?.completedAt && (
                      <p>完成时间: {new Date(progress.completedAt).toLocaleDateString('zh-CN')}</p>
                    )}
                    {isFavorite && progress?.favoritedAt && (
                      <p>收藏时间: {new Date(progress.favoritedAt).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}