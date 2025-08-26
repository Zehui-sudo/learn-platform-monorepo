'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLearningStore } from '@/store/learningStore';

function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

export function PageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLearnPage = pathname.startsWith('/learn');
  const initializeAllPaths = useLearningStore(state => state.initializeAllPaths);
  
  useEffect(() => {
    // 在应用启动时初始化所有语言的学习路径
    initializeAllPaths();
  }, [initializeAllPaths]);

  if (isLearnPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto p-4">{children}</main>
    </>
  );
}
