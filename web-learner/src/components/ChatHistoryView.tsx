'use client';

import { useState } from 'react';
import { useLearningStore } from '@/store/learningStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, Edit, Trash2 } from 'lucide-react';

interface ChatHistoryViewProps {
  onBack: () => void;
  onSelectChat: (sessionId: string) => void;
}

export function ChatHistoryView({ onBack, onSelectChat }: ChatHistoryViewProps) {
  const {
    chatSessions,
    deleteChat,
    renameChat,
  } = useLearningStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const filteredSessions = chatSessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRename = (sessionId: string) => {
    if (renameValue.trim()) {
      renameChat(sessionId, renameValue.trim());
      setRenamingId(null);
      setRenameValue('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background rounded-lg border">
      {/* Header */}
      <header className="p-3 border-b flex items-center gap-2 flex-shrink-0">
        <Button size="icon" variant="ghost" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Chat history</h1>
      </header>

      {/* Search Bar */}
      <div className="p-3 border-b flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search Chat"
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-3 space-y-2">
          {filteredSessions.map(session => (
            <div
              key={session.id}
              className="p-3 rounded-lg hover:bg-accent cursor-pointer flex justify-between items-center"
              onClick={() => !renamingId && onSelectChat(session.id)}
            >
              {renamingId === session.id ? (
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRename(session.id);
                    }
                  }}
                  onBlur={() => handleRename(session.id)}
                  autoFocus
                  className="h-8"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex flex-col">
                  <span className="font-medium">{session.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex items-center ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(session.id);
                    setRenameValue(session.title);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(session.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}