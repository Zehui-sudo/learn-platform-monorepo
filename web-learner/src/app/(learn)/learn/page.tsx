'use client';

import { useEffect } from 'react';
import { useLearningStore } from '@/store/learningStore';
import { ContentDisplay } from '@/components/ContentDisplay';

export default function LearnPage() {
  const loadPath = useLearningStore((state) => state.loadPath);

  useEffect(() => {
    // Get language from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const urlLanguage = urlParams.get('language') as 'python' | 'javascript' | null;
    const savedLanguage = localStorage.getItem('preferred-language') as 'python' | 'javascript' | null;
    
    const finalLanguage = urlLanguage || savedLanguage || 'python';
    loadPath(finalLanguage);
  }, [loadPath]);

  // The layout is now handled by the parent layout.tsx
  // This component is only responsible for displaying the content.
  return <ContentDisplay />;
}
