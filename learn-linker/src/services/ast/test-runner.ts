/**
 * Standalone test runner for AST Analyzer
 * Run with: npx ts-node src/services/ast/test-runner.ts
 */

import { ASTAnalyzer } from './analyzer';

interface TestCase {
  name: string;
  code: string;
  language: string;
  expectedFeatures?: {
    syntax?: string[];
    patterns?: string[];
    apiCalls?: string[];
  };
}

async function runTests() {
  console.log('🚀 AST Analyzer Test Suite\n');
  console.log('=' .repeat(60));
  
  const analyzer = ASTAnalyzer.getInstance();
  
  const testCases: TestCase[] = [
    {
      name: '✨ Async/Await Pattern',
      code: `
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}`,
      language: 'javascript',
      expectedFeatures: {
        syntax: ['async', 'trycatch'],
        patterns: ['async-await', 'error-handling'],
        apiCalls: ['fetch', 'response.json', 'console.error']
      }
    },
    {
      name: '🔗 Promise Chain',
      code: `
fetch('/api/users')
  .then(response => response.json())
  .then(users => console.log(users))
  .catch(error => console.error(error));`,
      language: 'javascript',
      expectedFeatures: {
        syntax: ['promise', 'arrowfunction'],
        patterns: ['promise-chain'],
        apiCalls: ['fetch', 'then', 'catch']
      }
    },
    {
      name: '📊 Array Methods',
      code: `
const numbers = [1, 2, 3, 4, 5];
const result = numbers
  .map(n => n * 2)
  .filter(n => n > 5)
  .reduce((sum, n) => sum + n, 0);`,
      language: 'javascript',
      expectedFeatures: {
        syntax: ['arrowfunction'],
        patterns: ['array-methods'],
        apiCalls: ['numbers.map', 'filter', 'reduce']
      }
    },
    {
      name: '🏗️ Class with Inheritance',
      code: `
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
}`,
      language: 'javascript',
      expectedFeatures: {
        syntax: ['classsyntax', 'template'],
        patterns: ['class-definition', 'inheritance'],
        apiCalls: ['console.log']
      }
    },
    {
      name: '🎯 Destructuring',
      code: `
const { name, age, ...rest } = person;
const [first, second, ...others] = numbers;

function processUser({ id, email }) {
  return \`User \${id}: \${email}\`;
}`,
      language: 'javascript',
      expectedFeatures: {
        syntax: ['destructuring', 'spread', 'template'],
        patterns: ['object-destructuring', 'array-destructuring']
      }
    },
    {
      name: '🐍 Python Decorator',
      code: `
@property
def name(self):
    return self._name

@cache
def expensive_function(n):
    return sum(range(n))`,
      language: 'python',
      expectedFeatures: {
        syntax: ['decorator'],
        patterns: ['decorator-pattern'],
        apiCalls: ['sum', 'range']
      }
    },
    {
      name: '🐍 Python List Comprehension',
      code: `
squares = [x**2 for x in range(10)]
evens = [n for n in numbers if n % 2 == 0]
matrix = [[i*j for j in range(3)] for i in range(3)]`,
      language: 'python',
      expectedFeatures: {
        syntax: ['listcomp'],
        patterns: ['list-comprehension'],
        apiCalls: ['range']
      }
    },
    {
      name: '🐍 Python Context Manager',
      code: `
with open('file.txt', 'r') as f:
    content = f.read()
    
async with session.get(url) as response:
    data = await response.json()`,
      language: 'python',
      expectedFeatures: {
        syntax: ['contextmanager', 'async'],
        patterns: ['context-manager', 'async-await'],
        apiCalls: ['open', 'f.read', 'session.get', 'response.json']
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('-' .repeat(50));
    
    try {
      const result = await analyzer.analyze(testCase.code, testCase.language, {
        includeContext: true,
        timeout: 5000
      });
      
      if (result.errors && result.errors.length > 0) {
        console.log('❌ Errors:', result.errors);
        failed++;
      } else {
        console.log('\n📊 Detected Features:');
        
        // Syntax Features
        console.log('  Syntax:', result.matchingFeatures.syntaxFlags.length > 0 
          ? result.matchingFeatures.syntaxFlags.join(', ')
          : 'none');
        
        // Patterns
        console.log('  Patterns:', result.matchingFeatures.patterns.length > 0
          ? result.matchingFeatures.patterns.join(', ')
          : 'none');
        
        // API Calls
        console.log('  APIs:', result.matchingFeatures.apiSignatures.length > 0
          ? result.matchingFeatures.apiSignatures.slice(0, 5).join(', ')
          : 'none');
        
        // Complexity
        console.log('  Complexity:', result.matchingFeatures.complexity);
        
        // Context Hints
        if (result.matchingFeatures.contextHints && Object.keys(result.matchingFeatures.contextHints).length > 0) {
          const hints = Object.entries(result.matchingFeatures.contextHints)
            .filter(([_, v]) => v)
            .map(([k, _]) => k);
          if (hints.length > 0) {
            console.log('  Hints:', hints.join(', '));
          }
        }
        
        // Metrics
        console.log('\n📈 Metrics:');
        console.log(`  Cyclomatic: ${result.features.complexity.cyclomaticComplexity}`);
        console.log(`  Lines: ${result.features.complexity.lineCount}`);
        console.log(`  Depth: ${result.features.complexity.maxDepth}`);
        
        // Validate expected features if provided
        if (testCase.expectedFeatures) {
          let testPassed = true;
          const issues: string[] = [];
          
          if (testCase.expectedFeatures.syntax) {
            const missingSyntax = testCase.expectedFeatures.syntax.filter(
              s => !result.matchingFeatures.syntaxFlags.includes(s)
            );
            if (missingSyntax.length > 0) {
              issues.push(`Missing syntax: ${missingSyntax.join(', ')}`);
              testPassed = false;
            }
          }
          
          if (testCase.expectedFeatures.patterns) {
            const missingPatterns = testCase.expectedFeatures.patterns.filter(
              p => !result.matchingFeatures.patterns.includes(p)
            );
            if (missingPatterns.length > 0) {
              issues.push(`Missing patterns: ${missingPatterns.join(', ')}`);
              testPassed = false;
            }
          }
          
          if (testPassed) {
            console.log('\n✅ Test PASSED');
            passed++;
          } else {
            console.log('\n⚠️  Test FAILED:');
            issues.forEach(issue => console.log(`   - ${issue}`));
            failed++;
          }
        } else {
          console.log('\n✅ Analysis completed');
          passed++;
        }
        
        // Performance
        if (result.performance) {
          console.log(`\n⏱️  Time: ${result.performance.totalTime}ms`);
        }
      }
    } catch (error) {
      console.error('❌ Test failed with error:', error instanceof Error ? error.message : error);
      failed++;
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total: ${passed + failed}`);
  console.log(`   🎯 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('\n✨ Test suite completed!');
}

// Run tests
console.clear();
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});