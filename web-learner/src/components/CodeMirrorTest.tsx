'use client';

import React, { useState } from 'react';
import { CodeMirrorCodeBlock } from './CodeMirrorCodeBlock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function CodeMirrorTest() {
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript');
  const [code, setCode] = useState(
    language === 'javascript' 
      ? `// JavaScript 示例
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));`
      : `# Python 示例
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))`
  );

  const toggleLanguage = () => {
    const newLang = language === 'javascript' ? 'python' : 'javascript';
    setLanguage(newLang);
    setCode(
      newLang === 'javascript' 
        ? `// JavaScript 示例
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));`
        : `# Python 示例
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))`
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>CodeMirror 代码编辑器测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              variant={language === 'javascript' ? 'default' : 'outline'}
              onClick={() => language !== 'javascript' && toggleLanguage()}
            >
              JavaScript
            </Button>
            <Button 
              variant={language === 'python' ? 'default' : 'outline'}
              onClick={() => language !== 'python' && toggleLanguage()}
            >
              Python
            </Button>
          </div>
          
          <CodeMirrorCodeBlock
            value={code}
            onChange={setCode}
            language={language}
            height="300px"
          />
          
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">当前代码：</h4>
            <pre className="text-sm">{code}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}