'use client';

import { useLearningStore } from '@/store/learningStore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight, CheckCircle2, Circle, Star, PanelLeftClose } from 'lucide-react';

type NavigationSidebarProps = {
  toggleSidebar: () => void;
};

export function NavigationSidebar({ toggleSidebar }: NavigationSidebarProps) {
  const currentPath = useLearningStore((state) => state.currentPath);
  const currentSection = useLearningStore((state) => state.currentSection);
  const loadSection = useLearningStore((state) => state.loadSection);
  const uiState = useLearningStore((state) => state.uiState);
  const updateUIState = useLearningStore((state) => state.updateUIState);
  const userProgress = useLearningStore((state) => state.userProgress);
  const { expandedChapters, searchQuery } = uiState;
  const currentSectionId = currentSection?.id || '';

  const filteredChapters = currentPath?.chapters.map(chapter => ({
    ...chapter,
    sections: chapter.sections.filter(section =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(chapter => 
    chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    chapter.sections.length > 0
  ) || [];

  const handleSectionClick = (section: { id: string; title: string; chapterId: string }) => {
    loadSection(section.id);
  };

  return (
    <div className="h-full flex flex-col bg-background rounded-lg">
      <div className="px-4 py-2 flex-shrink-0">
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">课程目录</h2>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索章节..."
              value={searchQuery}
              onChange={(e) => updateUIState({ searchQuery: e.target.value })}
              className="pl-9 text-sm"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="px-4">
          {filteredChapters.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              未找到匹配的章节
            </div>
          ) : (
            <Accordion
              type="multiple"
              value={expandedChapters}
              onValueChange={(value) => updateUIState({ expandedChapters: value })}
            >
              {filteredChapters.map((chapter, chapterIndex) => (
                <AccordionItem key={chapter.id} value={chapter.id}>
                  <AccordionTrigger className="px-0 py-3 hover:no-underline">
                    <div className="flex min-w-0 items-center gap-2 text-left">
                      <span className="text-xs font-mono text-muted-foreground">
                        {String(chapterIndex + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1 font-medium truncate">{chapter.title}</span>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {chapter.sections.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-1">
                      {chapter.sections.map((section, sectionIndex) => {
                        const progress = userProgress[section.id];
                        const isCompleted = progress?.isCompleted || false;
                        const isFavorite = progress?.isFavorite || false;
                        
                        return (
                          <Button
                            key={section.id}
                            variant={currentSectionId === section.id ? "secondary" : "ghost"}
                            className="w-full justify-start text-left px-3 py-2 h-auto font-normal"
                            onClick={() => handleSectionClick(section)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              {isCompleted ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                              ) : (
                                <Circle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className="text-sm flex-1 min-w-0 truncate">
                                {String(sectionIndex + 1).padStart(2, '0')} {section.title}
                              </span>
                              {isFavorite && (
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                              )}
                              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 flex-shrink-0">
        <div className="border-t pt-4">
          <div className="text-xs text-muted-foreground text-center">
            总进度: {currentPath?.chapters.reduce((acc, ch) => acc + ch.sections.length, 0) || 0} 章节
          </div>
        </div>
      </div>
    </div>
  );
}
