import type { LearningPath, Chapter } from '@/types';
import fs from 'fs';
import path from 'path';

/**
 * Get JavaScript learning path from markdown file
 */
export async function getJavaScriptLearningPath(): Promise<LearningPath> {
  // In server-side code, read the file directly
  const filePath = path.join(process.cwd(), 'public', 'javascript-learning-path.md');
  const markdown = fs.readFileSync(filePath, 'utf-8');
  
  const lines = markdown.split('\n');
  const learningPath: LearningPath = { id: '', title: '', language: 'javascript', chapters: [] };
  let currentChapter: Chapter | null = null;
  const idRegex = /\(id: (.*?)\)/;

  const pathLine = lines.find(line => line.startsWith('# '));
  if (pathLine) {
    learningPath.title = pathLine.replace('# ', '').replace(idRegex, '').trim();
    const pathIdMatch = pathLine.match(idRegex);
    if (pathIdMatch) learningPath.id = pathIdMatch[1];
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const title = line.replace('## ', '').replace(idRegex, '').trim();
      const idMatch = line.match(idRegex);
      if (idMatch) {
        currentChapter = { id: idMatch[1], title, sections: [] };
        learningPath.chapters.push(currentChapter);
      }
    } else if (line.startsWith('### ') && currentChapter) {
      const title = line.replace('### ', '').replace(idRegex, '').trim();
      const idMatch = line.match(idRegex);
      if (idMatch) {
        currentChapter.sections.push({
          id: idMatch[1],
          title,
          chapterId: currentChapter.id,
        });
      }
    }
  }
  return learningPath;
}

/**
 * Get Python learning path (mock data for now)
 */
export async function getPythonLearningPath(): Promise<LearningPath> {
  // Keep mock data for Python for now
  return {
    id: 'python-basics',
    title: 'Python 核心基础',
    language: 'python',
    chapters: [
      {
        id: 'python-ch-1-basics',
        title: '基础语法',
        sections: [
          { id: 'python-sec-1-1-variables', title: '变量与数据类型', chapterId: 'python-ch-1-basics' },
          { id: 'python-sec-1-2-operators', title: '运算符', chapterId: 'python-ch-1-basics' },
          { id: 'python-sec-1-3-strings', title: '字符串处理', chapterId: 'python-ch-1-basics' },
        ]
      },
      {
        id: 'python-ch-2-control',
        title: '控制流程',
        sections: [
          { id: 'python-sec-2-1-conditionals', title: '条件语句', chapterId: 'python-ch-2-control' },
          { id: 'python-sec-2-2-loops', title: '循环结构', chapterId: 'python-ch-2-control' },
          { id: 'python-sec-2-3-functions', title: '函数定义与调用', chapterId: 'python-ch-2-control' },
        ]
      },
      {
        id: 'python-ch-3-data-structures',
        title: '数据结构',
        sections: [
          { id: 'python-sec-3-1-lists', title: '列表', chapterId: 'python-ch-3-data-structures' },
          { id: 'python-sec-3-2-dicts', title: '字典', chapterId: 'python-ch-3-data-structures' },
          { id: 'python-sec-3-3-sets', title: '集合', chapterId: 'python-ch-3-data-structures' },
        ]
      },
      {
        id: 'python-ch-4-advanced',
        title: '高级特性',
        sections: [
          { id: 'python-sec-4-1-comprehensions', title: '推导式', chapterId: 'python-ch-4-advanced' },
          { id: 'python-sec-4-2-decorators', title: '装饰器', chapterId: 'python-ch-4-advanced' },
          { id: 'python-sec-4-3-generators', title: '生成器与迭代器', chapterId: 'python-ch-4-advanced' },
          { id: 'python-sec-4-4-context-managers', title: '上下文管理器', chapterId: 'python-ch-4-advanced' },
          { id: 'python-sec-4-5-async', title: '异步编程', chapterId: 'python-ch-4-advanced' },
        ]
      },
      {
        id: 'python-ch-5-oop',
        title: '面向对象',
        sections: [
          { id: 'python-sec-5-1-classes', title: '类与对象', chapterId: 'python-ch-5-oop' },
          { id: 'python-sec-5-2-inheritance', title: '继承与多态', chapterId: 'python-ch-5-oop' },
          { id: 'python-sec-5-3-magic-methods', title: '魔术方法', chapterId: 'python-ch-5-oop' },
        ]
      },
      {
        id: 'python-ch-6-exceptions',
        title: '异常处理',
        sections: [
          { id: 'python-sec-6-1-try-except', title: '异常捕获', chapterId: 'python-ch-6-exceptions' },
          { id: 'python-sec-6-2-custom-exceptions', title: '自定义异常', chapterId: 'python-ch-6-exceptions' },
        ]
      }
    ]
  };
}