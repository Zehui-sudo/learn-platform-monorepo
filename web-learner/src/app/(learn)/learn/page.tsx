'use client';

import { useEffect } from 'react';
import { useLearningStore } from '@/store/learningStore';
import { ContentDisplay } from '@/components/ContentDisplay';

export default function LearnPage() {
  const loadPath = useLearningStore((state) => state.loadPath);
  const loadSection = useLearningStore((state) => state.loadSection);
  const currentPath = useLearningStore((state) => state.currentPath);

  useEffect(() => {
    // Check if there's a hash that determines the language
    const hash = window.location.hash.slice(1);
    let hashLanguage: 'javascript' | 'python' | null = null;
    
    if (hash) {
      if (hash.startsWith('js-sec-')) {
        hashLanguage = 'javascript';
      } else if (hash.startsWith('py-sec-')) {
        hashLanguage = 'python';
      }
    }
    
    // Get language from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const urlLanguage = urlParams.get('language') as 'python' | 'javascript' | null;
    const savedLanguage = localStorage.getItem('preferred-language') as 'python' | 'javascript' | null;
    
    // Priority: hash language > URL parameter > saved preference > default
    const finalLanguage = hashLanguage || urlLanguage || savedLanguage || 'python';
    loadPath(finalLanguage);
    
    // If we determined language from hash, save it
    if (hashLanguage) {
      localStorage.setItem('preferred-language', hashLanguage);
    }
  }, [loadPath]);

  // Handle URL hash navigation after path is loaded
  useEffect(() => {
    if (!currentPath) return;
    
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    
    // Check if this hash belongs to the current language
    const belongsToCurrentLanguage = 
      (currentPath.language === 'javascript' && hash.startsWith('js-sec-')) ||
      (currentPath.language === 'python' && hash.startsWith('py-sec-'));
    
    if (belongsToCurrentLanguage) {
      // Find and load the section
      const allSections = currentPath.chapters.flatMap(ch => ch.sections);
      const targetSection = allSections.find(s => s.id === hash);
      if (targetSection) {
        loadSection(hash);
      }
    }
  }, [currentPath, loadSection]);

  // Handle hash changes during the session
  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      // Determine language from section ID prefix
      let targetLanguage: 'javascript' | 'python' | null = null;
      if (hash.startsWith('js-sec-')) {
        targetLanguage = 'javascript';
      } else if (hash.startsWith('py-sec-')) {
        targetLanguage = 'python';
      }

      if (targetLanguage) {
        // Load the correct language path
        await loadPath(targetLanguage);
        // Store the language preference
        localStorage.setItem('preferred-language', targetLanguage);
        // The section will be loaded by the effect above when currentPath changes
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadPath]);

  // The layout is now handled by the parent layout.tsx
  // This component is only responsible for displaying the content.
  return <ContentDisplay />;
}
