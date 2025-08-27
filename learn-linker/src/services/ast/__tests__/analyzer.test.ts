/**
 * AST Analyzer Test Suite
 */

import { ASTAnalyzer } from '../analyzer';
import { PatternType } from '../types';

describe('ASTAnalyzer', () => {
  let analyzer: ASTAnalyzer;

  beforeEach(() => {
    analyzer = ASTAnalyzer.getInstance();
  });

  describe('JavaScript Analysis', () => {
    test('should detect async/await pattern', async () => {
      const code = `
        async function fetchData() {
          try {
            const response = await fetch('/api/data');
            const data = await response.json();
            return data;
          } catch (error) {
            console.error(error);
          }
        }
      `;

      const result = await analyzer.analyze(code, 'javascript');
      
      expect(result.features.syntax.hasAsync).toBe(true);
      expect(result.features.syntax.hasTryCatch).toBe(true);
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.ASYNC_AWAIT })
      );
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.ERROR_HANDLING })
      );
      expect(result.features.apiCalls).toContainEqual(
        expect.objectContaining({ method: 'fetch' })
      );
      expect(result.matchingFeatures.syntaxFlags).toContain('async');
      expect(result.matchingFeatures.contextHints?.hasAsync).toBe(true);
      expect(result.matchingFeatures.contextHints?.hasErrorHandling).toBe(true);
    });

    test('should detect Promise chain pattern', async () => {
      const code = `
        fetch('/api/data')
          .then(response => response.json())
          .then(data => console.log(data))
          .catch(error => console.error(error));
      `;

      const result = await analyzer.analyze(code, 'javascript');
      
      expect(result.features.syntax.hasPromise).toBe(true);
      expect(result.features.syntax.hasArrowFunction).toBe(true);
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.PROMISE_CHAIN })
      );
      expect(result.features.apiCalls).toContainEqual(
        expect.objectContaining({ method: 'fetch' })
      );
    });

    test('should detect array methods', async () => {
      const code = `
        const numbers = [1, 2, 3, 4, 5];
        const doubled = numbers.map(n => n * 2);
        const evens = doubled.filter(n => n % 2 === 0);
        const sum = evens.reduce((a, b) => a + b, 0);
      `;

      const result = await analyzer.analyze(code, 'javascript');
      
      expect(result.features.syntax.hasArrowFunction).toBe(true);
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.ARRAY_METHODS })
      );
      expect(result.features.apiCalls).toContainEqual(
        expect.objectContaining({ object: 'numbers', method: 'map' })
      );
      expect(result.features.apiCalls).toContainEqual(
        expect.objectContaining({ object: 'doubled', method: 'filter' })
      );
      expect(result.features.apiCalls).toContainEqual(
        expect.objectContaining({ object: 'evens', method: 'reduce' })
      );
    });

    test('should detect class and inheritance', async () => {
      const code = `
        class Animal {
          constructor(name) {
            this.name = name;
          }
          speak() {
            console.log(\`\${this.name} makes a sound\`);
          }
        }
        
        class Dog extends Animal {
          speak() {
            console.log(\`\${this.name} barks\`);
          }
        }
      `;

      const result = await analyzer.analyze(code, 'javascript');
      
      expect(result.features.syntax.hasClassSyntax).toBe(true);
      expect(result.features.syntax.hasTemplate).toBe(true);
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.CLASS_DEFINITION })
      );
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.INHERITANCE })
      );
    });

    test('should detect destructuring', async () => {
      const code = `
        const { name, age } = person;
        const [first, second, ...rest] = numbers;
        
        function processUser({ id, name, email }) {
          console.log(id, name, email);
        }
      `;

      const result = await analyzer.analyze(code, 'javascript');
      
      expect(result.features.syntax.hasDestructuring).toBe(true);
      expect(result.features.syntax.hasSpread).toBe(true);
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.OBJECT_DESTRUCTURING })
      );
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.ARRAY_DESTRUCTURING })
      );
    });

    test('should calculate complexity metrics', async () => {
      const code = `
        function complexFunction(x) {
          if (x > 0) {
            if (x < 10) {
              return 'small';
            } else if (x < 100) {
              return 'medium';
            } else {
              return 'large';
            }
          } else if (x === 0) {
            return 'zero';
          } else {
            return 'negative';
          }
        }
      `;

      const result = await analyzer.analyze(code, 'javascript');
      
      expect(result.features.complexity.cyclomaticComplexity).toBeGreaterThan(1);
      expect(result.features.complexity.maxDepth).toBeGreaterThan(1);
      expect(result.matchingFeatures.complexity).toBe('medium');
    });
  });

  describe('Python Analysis', () => {
    test('should detect Python async/await', async () => {
      const code = `
async def fetch_data():
    try:
        response = await http_client.get('/api/data')
        data = await response.json()
        return data
    except Exception as e:
        print(f"Error: {e}")
        return None
      `;

      const result = await analyzer.analyze(code, 'python');
      
      expect(result.features.syntax.hasAsync).toBe(true);
      expect(result.features.syntax.hasTryCatch).toBe(true);
      expect(result.features.syntax.hasFString).toBe(true);
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.ASYNC_AWAIT })
      );
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.ERROR_HANDLING })
      );
    });

    test('should detect decorators', async () => {
      const code = `
@property
def name(self):
    return self._name

@name.setter
def name(self, value):
    self._name = value

@staticmethod
def validate(value):
    return len(value) > 0
      `;

      const result = await analyzer.analyze(code, 'python');
      
      expect(result.features.syntax.hasDecorator).toBe(true);
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.DECORATOR_PATTERN })
      );
    });

    test('should detect list comprehension', async () => {
      const code = `
numbers = [1, 2, 3, 4, 5]
squares = [n ** 2 for n in numbers]
evens = [n for n in numbers if n % 2 == 0]
matrix = [[i * j for j in range(3)] for i in range(3)]
      `;

      const result = await analyzer.analyze(code, 'python');
      
      expect(result.features.syntax.hasListComp).toBe(true);
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.LIST_COMPREHENSION })
      );
    });

    test('should detect generators', async () => {
      const code = `
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b
      `;

      const result = await analyzer.analyze(code, 'python');
      
      expect(result.features.syntax.hasPythonGenerator).toBe(true);
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.GENERATOR_PATTERN })
      );
    });

    test('should detect context managers', async () => {
      const code = `
with open('file.txt', 'r') as f:
    content = f.read()
    
with database.connection() as conn:
    cursor = conn.cursor()
    cursor.execute(query)
      `;

      const result = await analyzer.analyze(code, 'python');
      
      expect(result.features.syntax.hasContextManager).toBe(true);
      expect(result.features.patterns).toContainEqual(
        expect.objectContaining({ type: PatternType.CONTEXT_MANAGER })
      );
      expect(result.features.apiCalls).toContainEqual(
        expect.objectContaining({ method: 'open' })
      );
    });

    test('should detect type hints', async () => {
      const code = `
def greet(name: str, age: int = 0) -> str:
    return f"Hello {name}, age {age}"

def process_list(items: List[str]) -> Dict[str, int]:
    return {item: len(item) for item in items}
      `;

      const result = await analyzer.analyze(code, 'python');
      
      expect(result.features.syntax.hasTyping).toBe(true);
      expect(result.features.syntax.hasFString).toBe(true);
    });

    test('should extract Python imports', async () => {
      const code = `
import os
import sys
from typing import List, Dict, Optional
from collections import defaultdict
import numpy as np
import pandas as pd
      `;

      const result = await analyzer.analyze(code, 'python');
      
      expect(result.features.context.imports).toContainEqual(
        expect.objectContaining({ source: 'os' })
      );
      expect(result.features.context.imports).toContainEqual(
        expect.objectContaining({ source: 'typing', specifiers: ['List', 'Dict', 'Optional'] })
      );
    });
  });

  describe('TypeScript Analysis', () => {
    test('should detect TypeScript features', async () => {
      const code = `
        interface User {
          id: number;
          name: string;
          email?: string;
        }
        
        async function getUser(id: number): Promise<User> {
          const response = await fetch(\`/api/users/\${id}\`);
          return response.json();
        }
        
        const users: User[] = [];
      `;

      const result = await analyzer.analyze(code, 'typescript');
      
      expect(result.features.syntax.hasAsync).toBe(true);
      expect(result.features.syntax.hasTemplate).toBe(true);
      expect(result.features.apiCalls).toContainEqual(
        expect.objectContaining({ method: 'fetch' })
      );
    });
  });

  describe('Language Detection', () => {
    test('should auto-detect JavaScript', async () => {
      const code = `
        function hello() {
          const message = "Hello World";
          console.log(message);
        }
      `;

      const result = await analyzer.analyze(code); // No language specified
      expect(result.features.context.language).toBe('javascript');
    });

    test('should auto-detect Python', async () => {
      const code = `
def hello():
    message = "Hello World"
    print(message)
      `;

      const result = await analyzer.analyze(code); // No language specified
      expect(result.features.context.language).toBe('python');
    });

    test('should auto-detect TypeScript', async () => {
      const code = `
        interface Person {
          name: string;
          age: number;
        }
      `;

      const result = await analyzer.analyze(code); // No language specified
      expect(result.features.context.language).toBe('typescript');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid code gracefully', async () => {
      const code = `
        function broken() {
          const x = ;
          return
      `;

      const result = await analyzer.analyze(code, 'javascript');
      expect(result.errors).toHaveLength(0); // Parser has error recovery
      expect(result.features).toBeDefined();
    });

    test('should handle empty code', async () => {
      const result = await analyzer.analyze('', 'javascript');
      
      expect(result.features.patterns).toHaveLength(0);
      expect(result.features.apiCalls).toHaveLength(0);
      expect(result.matchingFeatures.complexity).toBe('low');
    });

    test('should handle unsupported language', async () => {
      const result = await analyzer.analyze('SELECT * FROM users', 'sql');
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].type).toBe('analysis');
    });
  });

  describe('Performance', () => {
    test('should complete analysis within timeout', async () => {
      const largeCode = Array(1000).fill('const x = 1;').join('\n');
      const startTime = Date.now();
      
      const result = await analyzer.analyze(largeCode, 'javascript', {
        timeout: 1000
      });
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1100); // Allow some margin
      expect(result.performance?.totalTime).toBeDefined();
    });
  });
});