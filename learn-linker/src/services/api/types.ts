export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ContextReference {
  text: string;
  source: string;
  type: 'code' | 'text';
}

export interface ChatRequest {
  messages: ChatMessage[];
  provider: string;
  language?: string;
  contextReference?: ContextReference;
}

export interface SectionLink {
  sectionId: string;
  title: string;
  chapterId: string;
  chapterTitle: string;
  language: string;
  matchedKeywords?: string[];
  relevanceScore: number;
  fusedScore: number;
  matchType: 'keyword' | 'semantic' | 'hybrid';
  confidence: 'low' | 'medium' | 'high';
  explanation?: string;
}

export interface LinksRequest {
  code: string;
  language: string;
  filePath?: string;
  repo?: string;
  astFeatures?: string[];
  topK?: number;
}

export interface Snippet {
  id: string;
  code: string;
  language: 'javascript' | 'python' | 'typescript';
  filePath?: string;
  repo?: string;
  relatedSections?: string[];
  tags?: string[];
  note?: string;
  savedAt: number;
  userId?: string;
}

export interface SaveSnippetRequest {
  code: string;
  language: 'javascript' | 'python' | 'typescript';
  filePath?: string;
  repo?: string;
  relatedSections?: string[];
  tags?: string[];
  note?: string;
}

export interface SaveSnippetResponse {
  id: string;
  savedAt: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface SSEChunk {
  type: 'content' | 'error' | 'done';
  content?: string;
  error?: string;
}

// Provider types
export type AIProvider = 'openai' | 'anthropic' | 'deepseek' | 'doubao';

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface ApiClientConfig {
  baseUrl: string;
  authToken?: string;
  timeout?: number;
  retries?: number;
}