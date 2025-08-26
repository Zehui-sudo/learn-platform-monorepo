import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { ContextReference as ContextReferenceType } from '@/types';

interface ContextReferenceProps {
  reference: ContextReferenceType;
  onClear: () => void;
}

export function ContextReference({ reference, onClear }: ContextReferenceProps) {
  return (
    <Card className="p-2 mb-2 bg-muted/50 border-muted">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              引用内容
            </Badge>
            {reference.source && (
              <span className="text-xs text-muted-foreground truncate">
                来自: {reference.source}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap break-words">
            {reference.text}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-6 w-6 p-0 hover:bg-background flex-shrink-0"
        >
          <X className="h-3 w-3" />
          <span className="sr-only">清除引用</span>
        </Button>
      </div>
    </Card>
  );
}