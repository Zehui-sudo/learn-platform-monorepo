import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LearningState, LearningActions, LearningPath, SectionContent, ChatMessage, ChatSession, PyodideStatus, ContextReference, AIProviderType, Chapter, SectionLink } from '@/types';
import { pyodideService } from '@/services/pyodideService';
import { getKnowledgeLinkService } from '@/services/knowledgeLinkService';
import { getHybridKnowledgeLinkService } from '@/services/hybridKnowledgeLinkService';

// Mock API functions - replace with real API calls
const mockLearningApi = {
  getLearningPath: async (language: 'python' | 'javascript'): Promise<LearningPath> => {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay

    if (language === 'python') {
      // Keep mock data for Python for now
      return {
        id: `python-basics`,
        title: `Python 核心基础`,
        language,
        chapters: [
          {
            id: `python-ch-1-basics`,
            title: '基础语法',
            sections: [
              { id: `python-sec-1-1-variables`, title: '变量与数据类型', chapterId: `python-ch-1-basics` },
            ]
          },
          {
            id: `python-ch-2-control`,
            title: '控制流程',
            sections: [
              { id: `python-sec-2-1-conditionals`, title: '条件语句', chapterId: `python-ch-2-control` },
            ]
          }
        ]
      };
    }

    // Fetch and parse JavaScript learning path from markdown
    const response = await fetch('/javascript-learning-path.md');
    if (!response.ok) {
      throw new Error('Failed to fetch javascript-learning-path.md');
    }
    const markdown = await response.text();
    
    const lines = markdown.split('\n');
    const path: LearningPath = { id: '', title: '', language, chapters: [] };
    let currentChapter: Chapter | null = null;
    const idRegex = /\(id: (.*?)\)/;

    const pathLine = lines.find(line => line.startsWith('# '));
    if (pathLine) {
      path.title = pathLine.replace('# ', '').replace(idRegex, '').trim();
      const pathIdMatch = pathLine.match(idRegex);
      if (pathIdMatch) path.id = pathIdMatch[1];
    }

    for (const line of lines) {
      if (line.startsWith('## ')) {
        const title = line.replace('## ', '').replace(idRegex, '').trim();
        const idMatch = line.match(idRegex);
        if (idMatch) {
          currentChapter = { id: idMatch[1], title, sections: [] };
          path.chapters.push(currentChapter);
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
    return path;
  },

  getSectionContent: async (sectionId: string): Promise<SectionContent> => {
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const response = await fetch(`/content/${sectionId}.md`);
      if (!response.ok) {
        throw new Error(`Markdown file not found for section: ${sectionId}`);
      }
      const markdown = await response.text();

      const contentBlocks: (import('@/types').MarkdownBlock | import('@/types').InteractiveCodeBlock)[] = [];
      
      // Regex to split by interactive code blocks, keeping the delimiter in a capturing group
      const parts = markdown.split(/(\`\`\`(?:javascript|python|html):interactive[\s\S]*?\`\`\`)/g);

      for (const part of parts) {
        if (!part || part.trim() === '') continue;

        const interactiveMatch = part.match(/\`\`\`(javascript|python|html):interactive\n([\s\S]*?)\`\`\`/);

        if (interactiveMatch) {
          const codeLanguage = interactiveMatch[1];
          // Treat html as a static markdown block for display, not interactive execution
          if (codeLanguage === 'html') {
             const lastBlock = contentBlocks[contentBlocks.length - 1];
             if (lastBlock && lastBlock.type === 'markdown') {
                lastBlock.content += `\n\n\`\`\`html\n${interactiveMatch[2].trim()}\n\`\`\``;
            } else {
                contentBlocks.push({
                    type: 'markdown',
                    content: `\`\`\`html\n${interactiveMatch[2].trim()}\n\`\`\``,
                });
            }
          } else {
            contentBlocks.push({
                type: 'code',
                language: codeLanguage as 'javascript' | 'python',
                code: interactiveMatch[2].trim(),
                isInteractive: true,
            });
          }
        } else {
          // It's a markdown block
          const lastBlock = contentBlocks[contentBlocks.length - 1];
          if (lastBlock && lastBlock.type === 'markdown') {
            lastBlock.content += part;
          } else {
            contentBlocks.push({
              type: 'markdown',
              content: part,
            });
          }
        }
      }

      return { id: sectionId, contentBlocks };

    } catch (error) {
      console.warn(error);
      
      // Fallback content
      return {
        id: sectionId,
        contentBlocks: [
          {
            type: 'markdown',
            content: `# ${sectionId.split('-').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n此章节的内容正在精心准备中，敬请期待！`
          }
        ]
      };
    }
  }
};

const createWelcomeMessage = (userName?: string, topic?: string): ChatMessage => ({
  id: Date.now().toString(),
  sender: 'ai',
  content: userName 
    ? `Hi, ${userName}! 我是你的AI学习助手。${topic ? `关于"${topic}"，` : ''}你有什么问题吗？`
    : `你好！我是你的AI学习助手。${topic ? `关于"${topic}"，` : ''}你有什么问题吗？我可以帮你解释概念、提供示例，或者解答你的疑问。`,
  timestamp: Date.now(),
});

export const useLearningStore = create<LearningState & LearningActions>()(
  persist(
    (set, get) => ({
      // State
      currentPath: null,
      currentSection: null,
      loadedPaths: {}, // 初始化为空对象
      loading: {
        path: false,
        section: false,
      },
      error: {
        path: null,
        section: null,
      },
      userCodeSnippets: {},
      uiState: {
        expandedChapters: [],
        searchQuery: '',
      },
      chatSessions: [],
      activeChatSessionId: null,
      aiProvider: 'openai' as AIProviderType,
      sendingMessage: false,
      pyodideStatus: 'unloaded' as PyodideStatus,
      pyodideError: null,
      fontSize: 16,
      selectedContent: null,
      userName: undefined,
      userProgress: {},
      hybridServiceInitialized: false,

      // Actions
      initializeAllPaths: async () => {
        const state = get();
        if (state.loading.path) return;
        
        set(state => ({
          loading: { ...state.loading, path: true },
          error: { ...state.error, path: null }
        }));
        
        try {
          // 并行加载所有语言的学习路径
          const [pythonPath, javascriptPath] = await Promise.all([
            mockLearningApi.getLearningPath('python'),
            mockLearningApi.getLearningPath('javascript')
          ]);
          
          const loadedPaths = {
            python: pythonPath,
            javascript: javascriptPath
          };
          
          set({
            loadedPaths,
            loading: { ...get().loading, path: false },
            error: { ...get().error, path: null }
          });
          
          // 初始化知识点服务
          const knowledgeLinkService = getKnowledgeLinkService();
          await knowledgeLinkService.initialize(loadedPaths);
          
          // 如果没有聊天会话，创建一个默认的
          if (get().chatSessions.length === 0) {
            get().createNewChat();
          }
        } catch (error) {
          set({
            loading: { ...get().loading, path: false },
            error: { ...get().error, path: error instanceof Error ? error.message : 'Failed to initialize paths' }
          });
        }
      },
      
      loadPath: async (language: 'python' | 'javascript') => {
        const state = get();
        if (state.loading.path || state.currentPath?.language === language) {
          return;
        }
        
        set(state => ({
          loading: { ...state.loading, path: true },
          error: { ...state.error, path: null }
        }));

        try {
          const path = await mockLearningApi.getLearningPath(language);
          
          // Update loadedPaths with the new path
          const updatedLoadedPaths = {
            ...get().loadedPaths,
            [language]: path
          };
          
          set({
            currentPath: path,
            loadedPaths: updatedLoadedPaths,
            loading: { ...get().loading, path: false },
            error: { ...get().error, path: null }
          });
          
          // Initialize knowledge link service with all loaded paths
          const knowledgeLinkService = getKnowledgeLinkService();
          await knowledgeLinkService.initialize(updatedLoadedPaths);
          
          // If no chats exist, create a default one
          if (get().chatSessions.length === 0) {
            get().createNewChat();
          }

          // Load Pyodide for Python language
          if (language === 'python' && get().pyodideStatus === 'unloaded') {
            get().loadPyodide();
          }

        } catch (error) {
          set({
            loading: { ...get().loading, path: false },
            error: { ...get().error, path: error instanceof Error ? error.message : 'Failed to load learning path' }
          });
        }
      },

      loadSection: async (sectionId: string) => {
        const state = get();
        if (state.loading.section || state.currentSection?.id === sectionId) {
          return;
        }
        
        set(state => ({
          loading: { ...state.loading, section: true },
          error: { ...state.error, section: null }
        }));

        try {
          const content = await mockLearningApi.getSectionContent(sectionId);
          set({
            currentSection: content,
            loading: { ...get().loading, section: false },
            error: { ...get().error, section: null }
          });
        } catch (error) {
          set({
            loading: { ...get().loading, section: false },
            error: { ...state.error, section: error instanceof Error ? error.message : 'Failed to load section content' }
          });
        }
      },

      updateUserCode: (sectionId: string, code: string) => {
        set(state => ({
          userCodeSnippets: {
            ...state.userCodeSnippets,
            [sectionId]: code
          }
        }));
      },

      updateUIState: (uiState: Partial<{ expandedChapters: string[]; searchQuery: string }>) => {
        set((state) => ({
          uiState: {
            ...state.uiState,
            ...uiState
          }
        }));
      },

      // --- Chat Actions ---
      createNewChat: () => {
        const state = get();
        const newSession: ChatSession = {
          id: `chat-${Date.now()}`,
          title: '新的对话',
          messages: [createWelcomeMessage(state.userName)],
          createdAt: Date.now(),
        };
        set(state => ({
          chatSessions: [...state.chatSessions, newSession],
          activeChatSessionId: newSession.id,
        }));
      },

      switchChat: (sessionId: string) => {
        if (get().chatSessions.some(s => s.id === sessionId)) {
          set({ activeChatSessionId: sessionId });
        }
      },

      deleteChat: (sessionId: string) => {
        set(state => {
          const remainingSessions = state.chatSessions.filter(s => s.id !== sessionId);
          let newActiveId = state.activeChatSessionId;

          if (newActiveId === sessionId) {
            newActiveId = remainingSessions.length > 0 ? remainingSessions[0].id : null;
          }
          
          return {
            chatSessions: remainingSessions,
            activeChatSessionId: newActiveId,
          };
        });
      },
      
      renameChat: (sessionId: string, newTitle: string) => {
        set(state => ({
          chatSessions: state.chatSessions.map(session => 
            session.id === sessionId ? { ...session, title: newTitle } : session
          ),
        }));
      },

      addMessageToActiveChat: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        set(state => {
          const activeId = state.activeChatSessionId;
          if (!activeId) return {};

          const newMessage: ChatMessage = {
            ...message,
            id: `${message.sender}-${Date.now()}`,
            timestamp: Date.now(),
          };

          return {
            chatSessions: state.chatSessions.map(session => {
              if (session.id === activeId) {
                // If it's the first user message, update the chat title
                const isFirstUserMessage = session.messages.filter(m => m.sender === 'user').length === 0 && message.sender === 'user';
                return {
                  ...session,
                  title: isFirstUserMessage ? message.content.substring(0, 20) : session.title,
                  messages: [...session.messages, newMessage],
                };
              }
              return session;
            }),
          };
        });
      },

      updateMessageContent: (sessionId: string, messageId: string, content: string) => {
        set(state => ({
          chatSessions: state.chatSessions.map(session => {
            if (session.id === sessionId) {
              return {
                ...session,
                messages: session.messages.map(message =>
                  message.id === messageId ? { ...message, content } : message
                ),
              };
            }
            return session;
          }),
        }));
      },

      updateMessageLinks: (sessionId: string, messageId: string, linkedSections: SectionLink[]) => {
        set(state => ({
          chatSessions: state.chatSessions.map(session => {
            if (session.id === sessionId) {
              return {
                ...session,
                messages: session.messages.map(message =>
                  message.id === messageId ? { ...message, linkedSections } : message
                ),
              };
            }
            return session;
          }),
        }));
      },

      // Pyodide Actions
      loadPyodide: async () => {
        const state = get();
        if (state.pyodideStatus !== 'unloaded') {
          return;
        }

        set({ pyodideStatus: 'loading', pyodideError: null });

        try {
          await pyodideService.loadPyodide();
          set({ pyodideStatus: 'ready', pyodideError: null });
        } catch (error) {
          set({
            pyodideStatus: 'error',
            pyodideError: error instanceof Error ? error.message : 'Failed to load Pyodide'
          });
        }
      },

      setFontSize: (fontSize: number) => {
        set({ fontSize });
      },

      // Context Selection Actions
      setSelectedContent: (content: ContextReference | null) => {
        set({ selectedContent: content });
      },

      // User Actions
      setUserName: (name: string) => {
        set({ userName: name });
      },

      // AI Provider Actions
      setAIProvider: (provider: AIProviderType) => {
        set({ aiProvider: provider });
      },

      // User Progress Actions
      toggleSectionComplete: (sectionId: string) => {
        set(state => {
          const progress = state.userProgress[sectionId] || {
            sectionId,
            isCompleted: false,
            isFavorite: false,
          };
          
          const updatedProgress = {
            ...progress,
            isCompleted: !progress.isCompleted,
            completedAt: !progress.isCompleted ? Date.now() : undefined,
          };
          
          return {
            userProgress: {
              ...state.userProgress,
              [sectionId]: updatedProgress,
            },
          };
        });
      },
      
      toggleSectionFavorite: (sectionId: string) => {
        set(state => {
          const progress = state.userProgress[sectionId] || {
            sectionId,
            isCompleted: false,
            isFavorite: false,
          };
          
          const updatedProgress = {
            ...progress,
            isFavorite: !progress.isFavorite,
            favoritedAt: !progress.isFavorite ? Date.now() : undefined,
          };
          
          return {
            userProgress: {
              ...state.userProgress,
              [sectionId]: updatedProgress,
            },
          };
        });
      },
      
      getSectionProgress: (sectionId: string) => {
        return get().userProgress[sectionId];
      },
      
      getCompletedCount: () => {
        const progress = get().userProgress;
        return Object.values(progress).filter(p => p.isCompleted).length;
      },
      
      getFavoriteCount: () => {
        const progress = get().userProgress;
        return Object.values(progress).filter(p => p.isFavorite).length;
      },

      // 初始化混合知识链接服务
      initializeHybridService: async () => {
        const state = get();
        if (state.hybridServiceInitialized) return;

        try {
          const hybridService = getHybridKnowledgeLinkService();
          
          // 获取所有章节数据
          const allSections: Array<{
            id: string;
            title: string;
            chapterTitle: string;
            language: 'python' | 'javascript';
          }> = [];
          Object.values(state.loadedPaths).forEach(path => {
            if (path) {
              path.chapters.forEach(chapter => {
                chapter.sections.forEach(section => {
                  allSections.push({
                    ...section,
                    chapterTitle: chapter.title,
                    language: path.language
                  });
                });
              });
            }
          });

          // 初始化语义索引
          await hybridService.initializeSemanticIndex(allSections);
          
          set({ hybridServiceInitialized: true });
          console.log('混合知识链接服务初始化完成');
        } catch (error) {
          console.error('混合知识链接服务初始化失败:', error);
        }
      },

      sendChatMessage: async (content: string, contextReference?: ContextReference | null) => {
        const state = get();
        const activeSessionId = state.activeChatSessionId;
        
        if (!activeSessionId || state.sendingMessage) {
          return;
        }

        // Add user message
        get().addMessageToActiveChat({
          content,
          sender: 'user',
          contextReference: contextReference || undefined,
        });

        // Add a placeholder for AI response
        const aiMessageId = `ai-${Date.now()}`;
        get().addMessageToActiveChat({
          id: aiMessageId,
          content: '▍', // Placeholder for streaming
          sender: 'ai',
        });

        set({ sendingMessage: true });

        try {
          const activeSession = get().chatSessions.find(s => s.id === activeSessionId);
          if (!activeSession) throw new Error('No active session');

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: activeSession.messages.filter(m => m.id !== aiMessageId), // Exclude placeholder
              provider: state.aiProvider,
              contextReference: contextReference,
              language: state.currentPath?.language,
            }),
          });

          if (!response.ok || !response.body) {
            throw new Error(`API error: ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulatedContent = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const delta = decoder.decode(value);
            accumulatedContent += delta;
            get().updateMessageContent(activeSessionId, aiMessageId, accumulatedContent + '▍');
          }
          // Remove the typing cursor at the end
          get().updateMessageContent(activeSessionId, aiMessageId, accumulatedContent);
          
          // Identify knowledge links in the AI response using hybrid service
          try {
            const state = get();
            let linkedSections: SectionLink[] = [];
            
            if (state.hybridServiceInitialized) {
              // 使用混合匹配服务
              const hybridService = getHybridKnowledgeLinkService();
              linkedSections = await hybridService.identifyLinks(
                accumulatedContent,
                { language: state.currentPath?.language }
              );
            } else {
              // 降级到原始的关键词匹配
              const knowledgeLinkService = getKnowledgeLinkService();
              linkedSections = knowledgeLinkService.identifyLinks(
                accumulatedContent
              );
            }
            
            if (linkedSections.length > 0) {
              get().updateMessageLinks(activeSessionId, aiMessageId, linkedSections);
            }
          } catch (error) {
            console.error('知识点链接识别失败:', error);
          }

        } catch (error) {
          console.error('Chat error:', error);
          const errorMessage = '抱歉，发送消息时出现错误。请稍后重试。';
          get().updateMessageContent(activeSessionId, aiMessageId, errorMessage);
        } finally {
          set({ sendingMessage: false });
        }
      },
    }),
    {
      name: 'learning-store',
      partialize: (state) => ({
        userCodeSnippets: state.userCodeSnippets,
        uiState: state.uiState,
        chatSessions: state.chatSessions,
        activeChatSessionId: state.activeChatSessionId,
        fontSize: state.fontSize,
        userName: state.userName,
        aiProvider: state.aiProvider,
        userProgress: state.userProgress,
        hybridServiceInitialized: state.hybridServiceInitialized,
      }),
    }
  )
);

// Initial state for non-persisted parts
useLearningStore.setState({
  currentPath: null,
  currentSection: null,
  loading: { path: false, section: false },
  error: { path: null, section: null },
  pyodideStatus: 'unloaded',
  pyodideError: null,
  selectedContent: null,
  sendingMessage: false,
});