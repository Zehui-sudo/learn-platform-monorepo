
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useLearningStore } from "@/store/learningStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, ChevronLeft, ChevronRight, BookOpen, Type } from "lucide-react";

export function LearnNavBar() {
  const { currentPath, currentSection, loadPath, loadSection, fontSize, setFontSize, userProgress } = useLearningStore();

  const languages = [
    { value: 'python', label: 'Python', logo: '/python-logo.svg' },
    { value: 'javascript', label: 'JavaScript', logo: '/javascript-logo.svg' },
  ];

  const selectedLanguage = languages.find(l => l.value === (currentPath?.language || ''));

  const {
    allSections,
    currentSectionIndex,
    currentChapterTitle,
    progressValue,
    language,
    completedCount,
  } = useMemo(() => {
    if (!currentPath || !currentSection) {
      return {
        allSections: [],
        currentSectionIndex: -1,
        currentChapterTitle: "",
        progressValue: 0,
        language: '',
        sectionId: '',
        completedCount: 0
      };
    }

    const sections = currentPath.chapters.flatMap((ch) => ch.sections);
    const currentIndex = sections.findIndex((s) => s.id === currentSection.id);
    const chapter = currentPath.chapters.find((ch) => 
      ch.sections.some(section => section.id === currentSection.id)
    );
    
    // 只计算当前语言路径下的章节完成情况
    const currentPathSectionIds = sections.map(s => s.id);
    const completed = Object.entries(userProgress)
      .filter(([sectionId, progress]) => 
        currentPathSectionIds.includes(sectionId) && progress.isCompleted
      ).length;
    
    const progress = sections.length > 0 ? (completed / sections.length) * 100 : 0;

    return {
      allSections: sections,
      currentSectionIndex: currentIndex,
      currentChapterTitle: chapter?.title || "",
      progressValue: progress,
      language: currentPath.language,
      sectionId: currentSection.id,
      completedCount: completed
    };
  }, [currentPath, currentSection, userProgress]);

  const handleLanguageChange = (newLang: "python" | "javascript") => {
    if (newLang !== language) {
      loadPath(newLang);
    }
  };

  const navigateToSection = (offset: number) => {
    const newIndex = currentSectionIndex + offset;
    if (newIndex >= 0 && newIndex < allSections.length) {
      const newSection = allSections[newIndex];
      loadSection(newSection.id);
    }
  };

  if (!currentPath) {
    // You might want a more sophisticated loading skeleton here
    return (
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background h-16">
        <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-8 w-48 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-6 w-6" />
            <span className="hidden sm:inline-block">My Dashboard</span>
          </Link>
          <Select
            value={language as string}
            onValueChange={(value) => handleLanguageChange(value as "python" | "javascript")}
          >
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center gap-2">
                {selectedLanguage ? (
                  <>
                    <Image
                      src={selectedLanguage.logo}
                      alt={selectedLanguage.label}
                      width={16}
                      height={16}
                    />
                    <span>{selectedLanguage.label}</span>
                  </>
                ) : (
                  <SelectValue placeholder="选择语言" />
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={lang.logo}
                      alt={lang.label}
                      width={16}
                      height={16}
                    />
                    <span>{lang.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Center Section */}
        <div className="flex-1 flex items-center justify-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateToSection(-1)}
                disabled={currentSectionIndex <= 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>上一节</p>
            </TooltipContent>
          </Tooltip>
          <div className="text-center">
            <p className="text-sm font-medium truncate">{currentChapterTitle}</p>
            <p className="text-xs text-muted-foreground truncate">
              {allSections[currentSectionIndex]?.title}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateToSection(1)}
                disabled={currentSectionIndex >= allSections.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>下一节</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 w-40">
            <Progress value={progressValue} className="w-full" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              已完成 {completedCount}/{allSections.length}
            </span>
          </div>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Type className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>调节字体大小</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>字体大小</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={fontSize.toString()} onValueChange={(value) => setFontSize(parseInt(value))}>
                <DropdownMenuRadioItem value="14">14px 小</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="16">16px 默认</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="18">18px 大</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="20">20px 特大</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <Home className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>返回主页</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
