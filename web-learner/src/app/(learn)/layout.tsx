'use client';

import * as React from 'react';
import { LearnNavBar } from '@/components/LearnNavBar';
import { NavigationSidebar } from '@/components/NavigationSidebar';
import { AIChatSidebar } from '@/components/AIChatSidebar';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PanelRightClose, PanelLeftClose } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navPanelRef = React.useRef<ImperativePanelHandle>(null);
  const aiPanelRef = React.useRef<ImperativePanelHandle>(null);
  const [isNavCollapsed, setIsNavCollapsed] = React.useState(false);
  const [isAiCollapsed, setIsAiCollapsed] = React.useState(false);

  const toggleNavSidebar = () => {
    const panel = navPanelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  const toggleAiSidebar = () => {
    const panel = aiPanelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <LearnNavBar />
      <main className="flex-1 overflow-hidden relative">
        {isNavCollapsed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-1/2 left-4 z-10 h-9 w-9 -translate-y-1/2"
                  onClick={toggleNavSidebar}
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>展开目录</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {isAiCollapsed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-1/2 right-4 z-10 h-9 w-9 -translate-y-1/2"
                  onClick={toggleAiSidebar}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>展开AI助手</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {/* TODO: Add mobile and tablet layouts */}
        <div className="hidden lg:flex h-full w-full p-4 bg-background">
          <ResizablePanelGroup direction="horizontal" className="max-w-full">
            <ResizablePanel
              ref={navPanelRef}
              collapsible
              defaultSize={20}
              minSize={22}
              onCollapse={() => setIsNavCollapsed(true)}
              onExpand={() => setIsNavCollapsed(false)}
            >
              <div className="h-full overflow-hidden">
                <NavigationSidebar toggleSidebar={toggleNavSidebar} />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="opacity-0" />
            <ResizablePanel defaultSize={55}>
              <Card className="h-full w-full p-4 shadow-sm overflow-auto">
                {children}
              </Card>
            </ResizablePanel>
            <ResizableHandle withHandle className="opacity-0" />
            <ResizablePanel
              ref={aiPanelRef}
              collapsible
              defaultSize={25}
              minSize={22}
              onCollapse={() => setIsAiCollapsed(true)}
              onExpand={() => setIsAiCollapsed(false)}
            >
              <div className="h-full pl-4">
                <AIChatSidebar toggleSidebar={toggleAiSidebar} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <div className="lg:hidden h-full w-full">
          {/* For now, just show content on smaller screens */}
          {children}
        </div>
      </main>
    </div>
  );
}
