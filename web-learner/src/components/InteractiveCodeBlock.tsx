'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLearningStore } from '@/store/learningStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Play, Copy, Check, AlertTriangle, Loader2, RotateCcw, Search, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeMirrorCodeBlock } from './CodeMirrorCodeBlock';
import { pyodideService } from '@/services/pyodideService';

interface InteractiveCodeBlockProps {
  language: 'python' | 'javascript';
  initialCode: string;
  sectionId: string;
  fontSize?: number;
}

export function InteractiveCodeBlock({ 
  language, 
  initialCode, 
  sectionId,
  fontSize = 16
}: InteractiveCodeBlockProps) {
  // Subscribe only to the specific code snippet for this section
  const userCode = useLearningStore((state) => state.userCodeSnippets[sectionId]);
  const updateUserCode = useLearningStore((state) => state.updateUserCode);
  const pyodideStatus = useLearningStore((state) => state.pyodideStatus);
  const pyodideError = useLearningStore((state) => state.pyodideError);
  
  const [code, setCode] = useState(userCode || initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Update code when section changes
  useEffect(() => {
    setCode(userCode || initialCode);
    setOutput('');
    setError('');
    setShowOutput(false);
  }, [sectionId, initialCode, userCode]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const handleCodeBlur = useCallback((newCode: string) => {
    updateUserCode(sectionId, newCode);
  }, [sectionId, updateUserCode]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setError('');
    setOutput('');
    setShowOutput(true);

    try {
      if (language === 'python') {
        // Check if Pyodide is ready
        if (pyodideStatus !== 'ready') {
          if (pyodideStatus === 'error') {
            throw new Error(pyodideError || 'Pyodide加载失败');
          }
          throw new Error('Python环境正在加载中，请稍候...');
        }

        // Execute Python code with Pyodide
        const result = await pyodideService.runPython(code);
        
        if (result.error) {
          setError(result.error);
        } else {
          setOutput(result.output);
        }
      } else {
        // JavaScript execution (using eval in a safe way)
        try {
          // Create a custom console to capture output
          const outputs: string[] = [];
          const customConsole = {
            log: (...args: unknown[]) => {
              outputs.push(args.map(arg => String(arg)).join(' '));
            }
          };

          // Create a function with the code and custom console
          const func = new Function('console', code);
          func(customConsole);

          setOutput(outputs.join('\n') || '代码执行成功！');
        } catch (jsError) {
          throw jsError;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '代码执行失败');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleResetCode = () => {
    setCode(initialCode);
    updateUserCode(sectionId, initialCode);
    setOutput('');
    setError('');
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchTerm('');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">代码练习</CardTitle>
            <Badge variant="outline" className="text-xs">
              {language.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {showSearch && (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="h-7 w-32 px-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSearchToggle}
                  className="h-7 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {!showSearch && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSearchToggle}
                className="h-7 px-2"
              >
                <Search className="h-3 w-3" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-7 px-2"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetCode}
              className="h-7 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Code Editor */}
        <div className="space-y-4">
          <div className="relative">
            <CodeMirrorCodeBlock
              value={code}
              onChange={handleCodeChange}
              onBlur={handleCodeBlur}
              language={language}
              className="border-0"
              searchTerm={searchTerm}
              enableSearch={showSearch}
              fontSize={fontSize}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Button
              type="button"
              size="sm"
              onClick={handleRunCode}
              disabled={isRunning || (language === 'python' && pyodideStatus === 'loading')}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  运行中...
                </>
              ) : language === 'python' && pyodideStatus === 'loading' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  准备Python环境...
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  运行代码
                </>
              )}
            </Button>
            
            <div className="text-xs text-muted-foreground">
              {code.length} 字符
            </div>
          </div>
        </div>

        {/* Output Section - Only shown when there's output or error */}
        {showOutput && (
          <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {output && !error && (
              <div className="rounded-lg border bg-muted/50">
                <div className="border-b px-3 py-2 text-sm font-medium">
                  输出结果
                </div>
                <ScrollArea className="max-h-[200px]">
                  <pre className="p-3 font-mono whitespace-pre-wrap" style={{ fontSize: `${fontSize * 0.875}px` }}>{output}</pre>
                </ScrollArea>
              </div>
            )}
            
            {!output && !error && (
              <div className="rounded-lg border bg-muted/50">
                <div className="border-b px-3 py-2 text-sm font-medium">
                  输出结果
                </div>
                <div className="p-4 text-center text-sm text-muted-foreground">
                  执行中...
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}