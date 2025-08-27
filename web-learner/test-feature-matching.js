#!/usr/bin/env node

/**
 * Test script for feature-based matching API
 * Tests the new AST feature matching system
 */

const testCases = [
  {
    name: '测试异步代码匹配',
    request: {
      language: 'javascript',
      features: {
        syntaxFlags: ['async', 'promise'],
        patterns: ['async-await', 'promise-chain'],
        apiSignatures: ['fetch', 'Promise.all', 'await'],
        complexity: 'medium',
        contextHints: {}
      },
      topK: 3
    },
    expectedMatch: '异步'
  },
  {
    name: '测试数组方法匹配',
    request: {
      language: 'javascript',
      features: {
        syntaxFlags: ['arrowfunction'],
        patterns: ['array-methods'],
        apiSignatures: ['map', 'filter', 'reduce'],
        complexity: 'low',
        contextHints: {}
      },
      topK: 3
    },
    expectedMatch: '数组'
  },
  {
    name: '测试类和面向对象匹配',
    request: {
      language: 'javascript',
      features: {
        syntaxFlags: ['classsyntax'],
        patterns: ['class-definition', 'inheritance'],
        apiSignatures: ['constructor', 'super', 'extends'],
        complexity: 'medium',
        contextHints: {}
      },
      topK: 3
    },
    expectedMatch: '类'
  },
  {
    name: '测试Python装饰器匹配',
    request: {
      language: 'python',
      features: {
        syntaxFlags: ['decorator'],
        patterns: ['decorator-pattern'],
        apiSignatures: ['@property', '@staticmethod'],
        complexity: 'high',
        contextHints: {}
      },
      topK: 3
    },
    expectedMatch: '装饰器'
  },
  {
    name: '测试Python生成器匹配',
    request: {
      language: 'python',
      features: {
        syntaxFlags: ['pythongenerator'],
        patterns: ['generator-pattern'],
        apiSignatures: ['yield', 'next'],
        complexity: 'medium',
        contextHints: {}
      },
      topK: 3
    },
    expectedMatch: '生成器'
  }
];

async function runTests() {
  console.log('🧪 开始测试特征匹配系统...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`📝 ${testCase.name}`);
    console.log(`   特征: ${testCase.request.features.patterns.join(', ')}`);
    console.log(`   API: ${testCase.request.features.apiSignatures.join(', ')}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.request)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        const topMatch = result.data[0];
        const matchFound = topMatch.title.includes(testCase.expectedMatch);
        
        if (matchFound) {
          console.log(`   ✅ 成功匹配到: "${topMatch.title}"`);
          console.log(`      置信度: ${topMatch.confidence || 'N/A'}`);
          console.log(`      得分: ${(topMatch.fusedScore * 100).toFixed(1)}%`);
          if (topMatch.explanation) {
            console.log(`      ${topMatch.explanation}`);
          }
          passed++;
        } else {
          console.log(`   ❌ 匹配失败，期望包含 "${testCase.expectedMatch}"`);
          console.log(`      实际匹配: "${topMatch.title}"`);
          failed++;
        }
        
        // 显示前3个匹配结果
        console.log(`   匹配结果:`);
        result.data.slice(0, 3).forEach((match, index) => {
          console.log(`      ${index + 1}. ${match.title} (${(match.fusedScore * 100).toFixed(1)}%)`);
        });
      } else {
        console.log(`   ❌ 没有返回匹配结果`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ 测试失败: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }
  
  // 测试混合语言（TypeScript映射到JavaScript）
  console.log('📝 测试TypeScript语言映射');
  try {
    const response = await fetch('http://localhost:3000/api/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: 'typescript',
        features: {
          syntaxFlags: ['async'],
          patterns: ['async-await'],
          apiSignatures: ['fetch'],
          complexity: 'low',
          contextHints: {}
        },
        topK: 1
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('   ✅ TypeScript成功映射到JavaScript进行匹配');
      passed++;
    } else {
      console.log('   ❌ TypeScript映射失败');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ TypeScript测试失败: ${error.message}`);
    failed++;
  }
  
  console.log('\n📊 测试结果汇总:');
  console.log(`   ✅ 通过: ${passed}`);
  console.log(`   ❌ 失败: ${failed}`);
  console.log(`   总计: ${passed + failed}`);
  console.log(`   成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  // 测试回退机制（仅提供代码，不提供特征）
  console.log('\n📝 测试回退到关键词匹配');
  try {
    const response = await fetch('http://localhost:3000/api/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'async function fetchData() { const data = await fetch("/api/data"); return data.json(); }',
        language: 'javascript',
        topK: 3
      })
    });
    
    const result = await response.json();
    if (result.success && result.matchingMethod === 'keyword-based') {
      console.log('   ✅ 成功回退到关键词匹配');
      console.log(`   匹配方法: ${result.matchingMethod}`);
    } else {
      console.log('   ❌ 回退机制失败');
    }
  } catch (error) {
    console.log(`   ❌ 回退测试失败: ${error.message}`);
  }
}

// 运行测试
runTests().catch(console.error);