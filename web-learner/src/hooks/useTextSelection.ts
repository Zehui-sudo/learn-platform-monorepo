import { useEffect, useCallback } from 'react';
import { useLearningStore } from '@/store/learningStore';
import type { ContextReference } from '@/types';

export function useTextSelection(containerRef: React.RefObject<HTMLElement>) {
  const setSelectedContent = useLearningStore((state) => state.setSelectedContent);
  const currentSection = useLearningStore((state) => state.currentSection);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      return;
    }

    // Check if selection is within our container
    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    const isWithinContainer = containerRef.current.contains(
      commonAncestor.nodeType === Node.TEXT_NODE 
        ? commonAncestor.parentNode 
        : commonAncestor
    );

    if (!isWithinContainer) {
      return;
    }

    // Determine content type based on parent elements
    let contentType: 'markdown' | 'code' = 'markdown';
    let parent = commonAncestor.parentElement;
    while (parent && parent !== containerRef.current) {
      if (parent.classList.contains('cm-editor') || parent.tagName === 'PRE') {
        contentType = 'code';
        break;
      }
      parent = parent.parentElement;
    }

    // Get section title as source
    const sectionTitle = currentSection?.id
      .split('-')
      .slice(-1)[0]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const contextReference: ContextReference = {
      text: selectedText,
      source: sectionTitle,
      type: contentType,
    };

    setSelectedContent(contextReference);
  }, [containerRef, setSelectedContent, currentSection]);

  // Handle keyboard shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isShortcut = isMac ? e.metaKey && e.key === 'l' : e.ctrlKey && e.key === 'l';
    
    if (isShortcut) {
      e.preventDefault();
      handleSelection();
      
      // Focus on chat input
      const chatInput = document.querySelector('[data-chat-input]') as HTMLTextAreaElement;
      if (chatInput) {
        chatInput.focus();
      }
    }
  }, [handleSelection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Listen for selection changes
    container.addEventListener('mouseup', handleSelection);
    container.addEventListener('keyup', handleSelection);
    
    // Listen for keyboard shortcuts globally
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('mouseup', handleSelection);
      container.removeEventListener('keyup', handleSelection);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSelection, handleKeyDown, containerRef]);

  return { handleSelection };
}