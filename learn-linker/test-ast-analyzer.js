#!/usr/bin/env node

/**
 * Test script for AST Analyzer
 * Run with: node test-ast-analyzer.js
 */

const fs = require('fs');
const path = require('path');

// Import the compiled JavaScript modules
const { ASTAnalyzer } = require('./out/services/ast/analyzer.js');

async function testAnalyzer() {
  console.log('=== AST Analyzer Test ===\n');
  
  // Initialize analyzer
  const analyzer = ASTAnalyzer.getInstance();
  
  // Test cases
  const testCases = [
    {
      name: 'Async/Await Pattern',
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
      language: 'javascript'
    },
    {
      name: 'Promise Chain',
      code: `
fetch('/api/users')
  .then(response => response.json())
  .then(users => console.log(users))
  .catch(error => console.error(error));`,
      language: 'javascript'
    },
    {
      name: 'Array Methods',
      code: `
const numbers = [1, 2, 3, 4, 5];
const result = numbers
  .map(n => n * 2)
  .filter(n => n > 5)
  .reduce((sum, n) => sum + n, 0);`,
      language: 'javascript'
    },
    {
      name: 'Python Decorator',
      code: `
@property
def name(self):
    return self._name

@cache
def expensive_function(n):
    return sum(range(n))`,
      language: 'python'
    },
    {
      name: 'Python List Comprehension',
      code: `
squares = [x**2 for x in range(10)]
evens = [n for n in numbers if n % 2 == 0]
matrix = [[i*j for j in range(3)] for i in range(3)]`,
      language: 'python'
    }
  ];
  
  // Run tests
  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log('=' .repeat(40));
    
    try {
      const result = await analyzer.analyze(testCase.code, testCase.language, {
        includeContext: true,
        timeout: 5000
      });
      
      if (result.errors && result.errors.length > 0) {
        console.log('Errors:', result.errors);
      } else {
        console.log('\n📊 Features Detected:');
        console.log('  Syntax Flags:', result.matchingFeatures.syntaxFlags);
        console.log('  Patterns:', result.matchingFeatures.patterns);
        console.log('  API Calls:', result.matchingFeatures.apiSignatures);
        console.log('  Complexity:', result.matchingFeatures.complexity);
        
        if (result.matchingFeatures.contextHints) {
          console.log('  Context Hints:', result.matchingFeatures.contextHints);
        }
        
        console.log('\n📈 Metrics:');
        console.log('  Cyclomatic Complexity:', result.features.complexity.cyclomaticComplexity);
        console.log('  Line Count:', result.features.complexity.lineCount);
        console.log('  Max Depth:', result.features.complexity.maxDepth);
        
        if (result.performance) {
          console.log('\n⏱️  Performance:');
          console.log('  Total Time:', result.performance.totalTime + 'ms');
        }
      }
    } catch (error) {
      console.error('Test failed:', error.message);
    }
  }
  
  console.log('\n\n=== Test Complete ===');
}

// Run the test
testAnalyzer().catch(console.error);