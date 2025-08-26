// 一级目录: 学习路径 (代表一门课程)
export interface LearningPath {
  id: string; // e.g., "python-basics"
  title: string; // e.g., "Python 核心基础"
  language: 'python' | 'javascript';
  chapters: Chapter[];
}

// 二级目录: 章 (代表一个知识模块)
export interface Chapter {
  id: string; // e.g., "py-ch-2-control-flow"
  title: string; // e.g., "控制流程"
  sections: Section[];
}

// 三级目录: 节 (代表一个具体知识点)
export interface Section {
  id: string; // e.g., "py-sec-2-1-if-statement"
  title: string; // e.g., "if 条件语句"
  chapterId: string; // 父章节的ID
}

// 节内容 (由内容块数组组成)
export interface SectionContent {
  id: string; // 与 Section.id 对应
  contentBlocks: (MarkdownBlock | InteractiveCodeBlock)[];
}

// 内容块1: Markdown 静态内容
export interface MarkdownBlock {
  type: 'markdown';
  content: string;
}

// 内容块2: 交互式代码
export interface InteractiveCodeBlock {
  type: 'code';
  language: 'python' | 'javascript';
  code: string;
  isInteractive: true;
}

// 用户进度数据
export interface UserProgress {
  sectionId: string;
  isCompleted: boolean;
  isFavorite: boolean;
  completedAt?: number;
  favoritedAt?: number;
}

// UI状态类型
export interface UIState {
  expandedChapters: string[];
  searchQuery: string;
}

// 知识点链接
export interface SectionLink {
  sectionId: string;          // 章节 ID
  title: string;              // 章节标题
  chapterId: string;          // 所属章节 ID
  chapterTitle?: string;      // 章节标题
  language: 'python' | 'javascript';
  matchedKeywords?: string[]; // 匹配到的关键词
  relevanceScore?: number;    // 相关性分数 (0-1)
  // 混合匹配新增字段
  fusedScore?: number;        // 融合后的最终分数
  matchType?: 'keyword' | 'semantic' | 'hybrid';  // 匹配类型
  confidence?: 'high' | 'medium' | 'low';         // 置信度
  explanation?: string;       // 匹配理由说明
  sourceMatches?: string[];   // 来源匹配（keyword/semantic）
}

// 知识点索引条目
export interface KnowledgeIndexEntry {
  sectionId: string;
  title: string;
  chapterId: string;
  chapterTitle: string;
  language: 'python' | 'javascript';
  keywords: string[];           // 主要关键词
  aliases: string[];            // 同义词和别名
  concepts: string[];           // 相关概念
  contentPreview?: string;      // 内容预览（前100字）
  codeExamples?: string[];      // 代码示例中的关键函数/类名
}

// Pyodide状态类型
export type PyodideStatus = 'unloaded' | 'loading' | 'ready' | 'error';

// 全局状态类型
export interface LearningState {
  currentPath: LearningPath | null;
  currentSection: SectionContent | null;
  loadedPaths: { javascript?: LearningPath; python?: LearningPath }; // 存储所有已加载的路径
  loading: {
    path: boolean;
    section: boolean;
  };
  error: {
    path: string | null;
    section: string | null;
  };
  userCodeSnippets: Record<string, string>; // Key: SectionID, Value: User's code
  uiState: UIState;
  userProgress: Record<string, UserProgress>; // Key: sectionId
  // AI Chat State
  chatSessions: ChatSession[];
  activeChatSessionId: string | null;
  // AI Provider State
  aiProvider: AIProviderType;
  sendingMessage: boolean;
  // Pyodide State
  pyodideStatus: PyodideStatus;
  pyodideError: string | null;
  // Font Size State
  fontSize: number;
  // Context Selection State
  selectedContent: ContextReference | null;
  // User Info
  userName?: string;
  // Hybrid Knowledge Link Service State
  hybridServiceInitialized: boolean;
}

// AI 对话消息
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: number; // 使用时间戳以方便序列化
  contextReference?: ContextReference; // 引用的上下文内容
  linkedSections?: SectionLink[]; // 相关知识点链接
}

// 上下文引用
export interface ContextReference {
  text: string; // 引用的文本内容
  source?: string; // 来源（如章节标题）
  type?: 'markdown' | 'code'; // 内容类型
}

// AI 对话会话
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface LearningActions {
  loadPath: (language: 'python' | 'javascript') => Promise<void>;
  initializeAllPaths: () => Promise<void>; // 初始化所有语言的学习路径
  loadSection: (sectionId: string) => Promise<void>;
  updateUserCode: (sectionId: string, code: string) => void;
  updateUIState: (uiState: Partial<UIState>) => void;
  // AI Chat Actions
  createNewChat: () => void;
  switchChat: (sessionId: string) => void;
  deleteChat: (sessionId: string) => void;
  renameChat: (sessionId: string, newTitle: string) => void;
  addMessageToActiveChat: (message: Partial<ChatMessage> & { sender: 'user' | 'ai', content: string }) => void;
  updateMessageContent: (sessionId: string, messageId: string, content: string) => void;
  updateMessageLinks: (sessionId: string, messageId: string, linkedSections: SectionLink[]) => void;
  // AI Provider Actions
  setAIProvider: (provider: AIProviderType) => void;
  sendChatMessage: (content: string, contextReference?: ContextReference | null, language?: 'python' | 'javascript') => Promise<void>;
  // Pyodide Actions
  loadPyodide: () => Promise<void>;
  // Font Size Actions
  setFontSize: (fontSize: number) => void;
  // Context Selection Actions
  setSelectedContent: (content: ContextReference | null) => void;
  // User Actions
  setUserName: (name: string) => void;
  // User Progress Actions
  toggleSectionComplete: (sectionId: string) => void;
  toggleSectionFavorite: (sectionId: string) => void;
  getSectionProgress: (sectionId: string) => UserProgress | undefined;
  getCompletedCount: () => number;
  getFavoriteCount: () => number;
  // Hybrid Knowledge Link Actions
  initializeHybridService: () => Promise<void>;
}

// API 响应类型
export interface LearningApi {
  getLearningPath: (language: 'python' | 'javascript') => Promise<LearningPath>;
  getSectionContent: (sectionId: string) => Promise<SectionContent>;
}

// AI Provider Types
export type AIProviderType = 'openai' | 'anthropic' | 'deepseek' | 'doubao';

// AI Chat API Types
export interface ChatAPIRequest {
  messages: ChatMessage[];
  provider: AIProviderType;
  model?: string;
  contextReference?: ContextReference;
  language?: 'python' | 'javascript';
}

export interface ChatAPIResponse {
  content: string;
  provider: AIProviderType;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}