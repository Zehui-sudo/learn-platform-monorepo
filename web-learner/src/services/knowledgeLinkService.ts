import type { KnowledgeIndexEntry, SectionLink, LearningPath } from '@/types';

// 技术术语词典 - JavaScript
const JS_KEYWORDS = {
  // 基础语法
  'variable': ['变量', 'var', 'let', 'const', '变量声明', '变量定义'],
  'datatype': ['数据类型', 'string', 'number', 'boolean', 'undefined', 'null', '类型'],
  'operator': ['运算符', '操作符', '+', '-', '*', '/', '运算'],
  'conditional': ['条件', 'if', 'else', 'switch', '条件语句', '判断', '分支'],
  'loop': ['循环', 'for', 'while', 'do-while', '遍历', '迭代'],
  'function': ['函数', 'function', '方法', 'method', '函数定义', '函数声明'],
  
  // DOM操作
  'dom': ['DOM', 'DOM树', '文档对象模型', 'document'],
  'element': ['元素', 'element', 'querySelector', 'getElementById', '选择器', '节点'],
  'event': ['事件', 'event', 'addEventListener', '事件监听', '事件处理', 'click', '点击'],
  'style': ['样式', 'style', 'CSS', 'classList', '类名', 'className'],
  
  // 异步编程
  'async': ['异步', 'async', 'asynchronous', '异步编程', '非阻塞'],
  'callback': ['回调', 'callback', '回调函数', '回调地狱'],
  'promise': ['Promise', 'promise', '承诺', 'then', 'catch', 'resolve', 'reject'],
  'await': ['await', 'async/await', '等待', '异步等待'],
  'fetch': ['fetch', 'ajax', 'http', '网络请求', 'API调用', '数据获取'],
  
  // 面向对象
  'object': ['对象', 'object', '对象字面量', '属性', 'property'],
  'this': ['this', 'this关键字', '上下文', 'context', '作用域'],
  'class': ['类', 'class', 'constructor', '构造函数', '实例', 'instance'],
  'es6': ['ES6', 'ES2015', '解构', '箭头函数', '模板字符串', 'spread', '展开运算符'],
  'module': ['模块', 'module', 'import', 'export', '模块化', '导入', '导出']
};

// 技术术语词典 - Python
const PY_KEYWORDS = {
  'variable': ['变量', '变量定义', '赋值', '=', '变量名'],
  'datatype': ['数据类型', 'int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', '类型'],
  'conditional': ['条件', 'if', 'elif', 'else', '条件语句', '判断', '分支'],
};

export class KnowledgeLinkService {
  private knowledgeIndex: Map<string, KnowledgeIndexEntry> = new Map();
  private keywordToSections: Map<string, Set<string>> = new Map(); // 倒排索引
  private initializedLanguages: Set<'javascript' | 'python'> = new Set(); // 跟踪已初始化的语言
  private cache: Map<string, SectionLink[]> = new Map(); // 查询缓存
  
  // 初始化知识点索引（支持增量更新）
  async initialize(learningPaths: { javascript?: LearningPath; python?: LearningPath }) {
    // 构建 JavaScript 索引
    if (learningPaths.javascript && !this.initializedLanguages.has('javascript')) {
      this.buildIndexFromPath(learningPaths.javascript);
      this.initializedLanguages.add('javascript');
    }
    
    // 构建 Python 索引
    if (learningPaths.python && !this.initializedLanguages.has('python')) {
      this.buildIndexFromPath(learningPaths.python);
      this.initializedLanguages.add('python');
    }
  }
  
  // 从学习路径构建索引
  private buildIndexFromPath(path: LearningPath) {
    for (const chapter of path.chapters) {
      for (const section of chapter.sections) {
        // 提取关键词
        const keywords = this.extractKeywordsFromTitle(section.title, path.language);
        const aliases = this.getAliasesForKeywords(keywords, path.language);
        
        const entry: KnowledgeIndexEntry = {
          sectionId: section.id,
          title: section.title,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          language: path.language,
          keywords,
          aliases,
          concepts: [], // 后续可以从内容中提取
          contentPreview: '', // 后续可以从内容中提取
          codeExamples: [] // 后续可以从内容中提取
        };
        
        // 存储到主索引
        this.knowledgeIndex.set(section.id, entry);
        
        // 构建倒排索引
        const allTerms = [...keywords, ...aliases];
        for (const term of allTerms) {
          const normalizedTerm = term.toLowerCase();
          if (!this.keywordToSections.has(normalizedTerm)) {
            this.keywordToSections.set(normalizedTerm, new Set());
          }
          this.keywordToSections.get(normalizedTerm)!.add(section.id);
        }
      }
    }
  }
  
  // 从标题提取关键词
  private extractKeywordsFromTitle(title: string, language: 'python' | 'javascript'): string[] {
    const keywords: string[] = [];
    const titleLower = title.toLowerCase();
    
    // 基于语言选择词典
    const dictionary = language === 'javascript' ? JS_KEYWORDS : PY_KEYWORDS;
    
    // 查找匹配的技术术语
    for (const [key, terms] of Object.entries(dictionary)) {
      for (const term of terms) {
        if (titleLower.includes(term.toLowerCase())) {
          keywords.push(key);
          break;
        }
      }
    }
    
    // 提取英文单词（技术术语）
    const englishWords = title.match(/[a-zA-Z]+/g) || [];
    keywords.push(...englishWords.filter(w => w.length > 2));
    
    // 提取中文关键词（2-4个字的词组）
    const chineseWords = title.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    keywords.push(...chineseWords);
    
    return [...new Set(keywords)]; // 去重
  }
  
  // 获取关键词的别名
  private getAliasesForKeywords(keywords: string[], language: 'python' | 'javascript'): string[] {
    const aliases: string[] = [];
    const dictionary = language === 'javascript' ? JS_KEYWORDS : PY_KEYWORDS;
    
    for (const keyword of keywords) {
      const keyLower = keyword.toLowerCase();
      for (const [key, terms] of Object.entries(dictionary)) {
        if (key === keyLower || terms.some(t => t.toLowerCase() === keyLower)) {
          aliases.push(...terms.filter(t => t.toLowerCase() !== keyLower));
          break;
        }
      }
    }
    
    return [...new Set(aliases)];
  }
  
  // 识别文本中的知识点链接
  identifyLinks(
    text: string, 
    language?: 'python' | 'javascript',
    maxResults: number = 5
  ): SectionLink[] {
    // 检查缓存
    const cacheKey = `${text.substring(0, 100)}_${language || 'all'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // 提取查询关键词
    const queryKeywords = this.extractQueryKeywords(text);
    
    // 计算每个章节的相关性分数
    const sectionScores = new Map<string, number>();
    
    for (const keyword of queryKeywords) {
      const normalizedKeyword = keyword.toLowerCase();
      
      // 查找包含此关键词的章节
      const sections = this.keywordToSections.get(normalizedKeyword) || new Set();
      
      for (const sectionId of sections) {
        const entry = this.knowledgeIndex.get(sectionId);
        if (!entry) continue;
        
        // 如果指定了语言，只返回对应语言的结果
        // 如果没有指定语言，返回所有语言的结果
        if (language && entry.language !== language) continue;
        
        // 计算相关性分数
        const currentScore = sectionScores.get(sectionId) || 0;
        const keywordScore = this.calculateKeywordScore(keyword, entry);
        sectionScores.set(sectionId, currentScore + keywordScore);
      }
    }
    
    // 排序并返回最相关的结果
    const sortedSections = Array.from(sectionScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxResults);
    
    const results: SectionLink[] = sortedSections.map(([sectionId, score]) => {
      const entry = this.knowledgeIndex.get(sectionId)!;
      return {
        sectionId: entry.sectionId,
        title: entry.title,
        chapterId: entry.chapterId,
        chapterTitle: entry.chapterTitle,
        language: entry.language,
        matchedKeywords: queryKeywords.filter(k => 
          entry.keywords.some(ek => ek.toLowerCase().includes(k.toLowerCase())) ||
          entry.aliases.some(ea => ea.toLowerCase().includes(k.toLowerCase()))
        ),
        relevanceScore: Math.min(score / queryKeywords.length, 1) // 归一化分数
      };
    });
    
    // 缓存结果
    this.cache.set(cacheKey, results);
    
    return results;
  }
  
  // 提取查询中的关键词
  private extractQueryKeywords(text: string): string[] {
    const keywords: string[] = [];
    const textLower = text.toLowerCase();
    
    // 提取英文单词（3个字母以上）
    const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];
    keywords.push(...englishWords);
    
    // 提取中文关键词（2-4个字）
    const chineseWords = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    keywords.push(...chineseWords);
    
    // 检查是否包含已知的技术术语
    for (const [, terms] of Object.entries({ ...JS_KEYWORDS, ...PY_KEYWORDS })) {
      for (const term of terms) {
        if (textLower.includes(term.toLowerCase()) && term.length > 2) {
          keywords.push(term);
        }
      }
    }
    
    return [...new Set(keywords)];
  }
  
  // 计算关键词得分
  private calculateKeywordScore(keyword: string, entry: KnowledgeIndexEntry): number {
    let score = 0;
    const keywordLower = keyword.toLowerCase();
    
    // 标题中的精确匹配得分最高
    if (entry.title.toLowerCase().includes(keywordLower)) {
      score += 3;
    }
    
    // 主关键词匹配
    if (entry.keywords.some(k => k.toLowerCase() === keywordLower)) {
      score += 2;
    }
    
    // 别名匹配
    if (entry.aliases.some(a => a.toLowerCase() === keywordLower)) {
      score += 1.5;
    }
    
    // 部分匹配
    if (entry.keywords.some(k => k.toLowerCase().includes(keywordLower))) {
      score += 1;
    }
    
    return score;
  }
  
  // 清除缓存
  clearCache() {
    this.cache.clear();
  }
  
  // 获取相关章节（基于当前章节）
  getRelatedSections(currentSectionId: string, maxResults: number = 3): SectionLink[] {
    const currentEntry = this.knowledgeIndex.get(currentSectionId);
    if (!currentEntry) return [];
    
    // 基于关键词查找相关章节
    const relatedScores = new Map<string, number>();
    
    for (const keyword of currentEntry.keywords) {
      const sections = this.keywordToSections.get(keyword.toLowerCase()) || new Set();
      for (const sectionId of sections) {
        if (sectionId === currentSectionId) continue;
        
        const entry = this.knowledgeIndex.get(sectionId);
        if (!entry || entry.language !== currentEntry.language) continue;
        
        const currentScore = relatedScores.get(sectionId) || 0;
        relatedScores.set(sectionId, currentScore + 1);
      }
    }
    
    // 返回最相关的章节
    const sortedSections = Array.from(relatedScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxResults);
    
    return sortedSections.map(([sectionId, score]) => {
      const entry = this.knowledgeIndex.get(sectionId)!;
      return {
        sectionId: entry.sectionId,
        title: entry.title,
        chapterId: entry.chapterId,
        chapterTitle: entry.chapterTitle,
        language: entry.language,
        relevanceScore: Math.min(score / currentEntry.keywords.length, 1)
      };
    });
  }
}

// 单例实例
let serviceInstance: KnowledgeLinkService | null = null;

export function getKnowledgeLinkService(): KnowledgeLinkService {
  if (!serviceInstance) {
    serviceInstance = new KnowledgeLinkService();
  }
  return serviceInstance;
}