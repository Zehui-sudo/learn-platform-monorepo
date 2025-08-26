# 增量式集成架构设计文档

## 概述

本文档详细描述Learn-Linker插件的增量式集成架构设计，确保基础功能独立运行，平台连接作为可选增强。

## 设计理念

### 核心原则

1. **独立优先（Independence First）**
   - 基础功能不依赖任何外部平台
   - 用户安装即可使用核心功能

2. **渐进增强（Progressive Enhancement）**
   - 平台连接提供额外价值
   - 功能逐步解锁，不强制全部启用

3. **故障隔离（Fault Isolation）**
   - 平台故障不影响基础功能
   - 各服务独立失败和恢复

4. **数据主权（Data Sovereignty）**
   - 用户数据本地优先
   - 同步是可选的便利功能

## 架构分层

```
┌──────────────────────────────────────────┐
│           Presentation Layer              │
│  (Webview, Tree View, Status Bar)        │
├──────────────────────────────────────────┤
│           Command Layer                   │
│  (Unified Command Handler)                │
├──────────────────────────────────────────┤
│           Service Layer                   │
├─────────────────┬─────────────────────────┤
│   Core Services │   Platform Services     │
│   (Always On)   │   (Optional)            │
│ - AI Service    │ - Connection Manager   │
│ - Local Storage │ - Knowledge Service    │
│ - UI Service    │ - Sync Service         │
└─────────────────┴─────────────────────────┘
```

## 详细设计

### 1. 服务注册与依赖注入

```typescript
// 服务容器设计
class ServiceContainer {
  private services = new Map<string, any>();
  
  // 注册核心服务（启动时必须）
  registerCore() {
    this.register('ai', new AIService());
    this.register('storage', new LocalStorage());
    this.register('ui', new UIService());
  }
  
  // 注册平台服务（连接后可选）
  async registerPlatform(config: PlatformConfig) {
    if (!config.enabled) return;
    
    const platform = new PlatformService(config);
    if (await platform.connect()) {
      this.register('platform', platform);
      this.register('knowledge', new KnowledgeService(platform));
      this.register('sync', new SyncService(platform));
    }
  }
  
  // 安全获取服务
  get<T>(name: string): T | undefined {
    return this.services.get(name);
  }
  
  // 检查服务可用性
  has(name: string): boolean {
    return this.services.has(name);
  }
}
```

### 2. AI服务实现（核心）

```typescript
interface AIProvider {
  explain(code: string, options?: ExplainOptions): Promise<ReadableStream<string>>;
  test(): Promise<boolean>;
}

class OpenAIProvider implements AIProvider {
  constructor(private config: OpenAIConfig) {}
  
  async explain(code: string, options?: ExplainOptions) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a code explanation assistant...'
          },
          {
            role: 'user',
            content: `Explain this ${options?.language || ''} code:\n${code}`
          }
        ],
        stream: true
      })
    });
    
    return response.body!;
  }
  
  async test(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// AI服务工厂
class AIService {
  private provider: AIProvider;
  
  constructor(config: AIConfig) {
    this.provider = this.createProvider(config);
  }
  
  private createProvider(config: AIConfig): AIProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'deepseek':
        return new DeepSeekProvider(config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
  
  async explainCode(code: string, context?: CodeContext) {
    const options: ExplainOptions = {
      language: context?.language,
      fileName: context?.fileName,
      additionalContext: context?.additionalContext
    };
    
    return this.provider.explain(code, options);
  }
}
```

### 3. 本地存储实现（核心）

```typescript
interface Snippet {
  id: string;
  code: string;
  language: string;
  explanation?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
  filePath?: string;
  isDirty?: boolean;  // 需要同步
}

class LocalStorage {
  constructor(private context: vscode.ExtensionContext) {}
  
  // 获取存储
  private get storage() {
    return this.context.workspaceState;
  }
  
  // CRUD操作
  async save(snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = this.generateId();
    const now = Date.now();
    
    const fullSnippet: Snippet = {
      ...snippet,
      id,
      createdAt: now,
      updatedAt: now,
      isDirty: true  // 标记为需要同步
    };
    
    const snippets = await this.list();
    snippets.push(fullSnippet);
    await this.storage.update('snippets', snippets);
    
    return fullSnippet;
  }
  
  async list(filter?: FilterOptions): Promise<Snippet[]> {
    const snippets = this.storage.get<Snippet[]>('snippets', []);
    
    if (!filter) return snippets;
    
    return snippets.filter(s => {
      if (filter.language && s.language !== filter.language) return false;
      if (filter.tags?.length) {
        const hasTag = filter.tags.some(tag => s.tags.includes(tag));
        if (!hasTag) return false;
      }
      if (filter.isDirty !== undefined && s.isDirty !== filter.isDirty) {
        return false;
      }
      return true;
    });
  }
  
  async update(id: string, updates: Partial<Snippet>) {
    const snippets = await this.list();
    const index = snippets.findIndex(s => s.id === id);
    
    if (index === -1) throw new Error('Snippet not found');
    
    snippets[index] = {
      ...snippets[index],
      ...updates,
      updatedAt: Date.now(),
      isDirty: true
    };
    
    await this.storage.update('snippets', snippets);
    return snippets[index];
  }
  
  async delete(id: string) {
    const snippets = await this.list();
    const filtered = snippets.filter(s => s.id !== id);
    await this.storage.update('snippets', filtered);
  }
  
  // 导出功能
  async export(format: 'json' | 'markdown'): Promise<string> {
    const snippets = await this.list();
    
    if (format === 'json') {
      return JSON.stringify(snippets, null, 2);
    }
    
    // Markdown格式
    let markdown = '# Code Snippets\n\n';
    for (const snippet of snippets) {
      markdown += `## ${snippet.id}\n\n`;
      markdown += `**Language:** ${snippet.language}\n`;
      markdown += `**Tags:** ${snippet.tags.join(', ')}\n`;
      markdown += `**Created:** ${new Date(snippet.createdAt).toLocaleString()}\n\n`;
      markdown += '```' + snippet.language + '\n';
      markdown += snippet.code;
      markdown += '\n```\n\n';
      if (snippet.explanation) {
        markdown += `**Explanation:**\n${snippet.explanation}\n\n`;
      }
      markdown += '---\n\n';
    }
    
    return markdown;
  }
  
  // 标记为已同步
  async markSynced(ids: string[], syncTime: number) {
    const snippets = await this.list();
    
    for (const snippet of snippets) {
      if (ids.includes(snippet.id)) {
        snippet.isDirty = false;
        snippet.syncedAt = syncTime;
      }
    }
    
    await this.storage.update('snippets', snippets);
  }
  
  private generateId(): string {
    return `snippet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 4. 平台服务实现（可选）

```typescript
class PlatformService {
  private client?: ApiClient;
  private connected = false;
  private reconnectTimer?: NodeJS.Timer;
  
  constructor(private config: PlatformConfig) {}
  
  async connect(): Promise<boolean> {
    try {
      this.client = new ApiClient({
        baseUrl: this.config.url,
        authToken: this.config.token,
        timeout: 10000
      });
      
      // 测试连接
      const isConnected = await this.client.testConnection();
      
      if (isConnected) {
        this.connected = true;
        this.startHeartbeat();
        vscode.window.showInformationMessage('Connected to learning platform');
      }
      
      return isConnected;
    } catch (error) {
      this.logger.error('Failed to connect to platform', error);
      this.scheduleReconnect();
      return false;
    }
  }
  
  disconnect() {
    this.connected = false;
    this.stopHeartbeat();
    this.client = undefined;
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  getClient(): ApiClient | undefined {
    return this.connected ? this.client : undefined;
  }
  
  private startHeartbeat() {
    // 每30秒检查连接
    this.heartbeatTimer = setInterval(async () => {
      if (!this.client) return;
      
      try {
        await this.client.testConnection();
      } catch {
        this.connected = false;
        this.scheduleReconnect();
      }
    }, 30000);
  }
  
  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    // 指数退避重连
    let delay = 5000;
    const maxDelay = 60000;
    
    const attemptReconnect = async () => {
      if (await this.connect()) {
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = undefined;
      } else {
        delay = Math.min(delay * 2, maxDelay);
      }
    };
    
    this.reconnectTimer = setInterval(attemptReconnect, delay);
  }
}
```

### 5. 同步服务实现

```typescript
class SyncService {
  private syncQueue: Snippet[] = [];
  private syncing = false;
  
  constructor(
    private platform: PlatformService,
    private localStorage: LocalStorage
  ) {
    this.setupAutoSync();
  }
  
  private setupAutoSync() {
    // 每5分钟自动同步
    setInterval(() => {
      if (this.platform.isConnected()) {
        this.syncAll();
      }
    }, 5 * 60 * 1000);
  }
  
  async syncAll() {
    if (this.syncing) return;
    if (!this.platform.isConnected()) return;
    
    this.syncing = true;
    
    try {
      // 获取需要同步的条目
      const dirtySnippets = await this.localStorage.list({ isDirty: true });
      
      if (dirtySnippets.length === 0) {
        this.syncing = false;
        return;
      }
      
      // 批量同步
      const client = this.platform.getClient();
      if (!client) {
        this.syncing = false;
        return;
      }
      
      const response = await client.post('/api/snippets/sync', {
        snippets: dirtySnippets,
        lastSyncTime: await this.getLastSyncTime()
      });
      
      // 处理同步结果
      if (response.synced?.length > 0) {
        await this.localStorage.markSynced(response.synced, response.serverTime);
      }
      
      // 处理冲突
      if (response.conflicts?.length > 0) {
        await this.handleConflicts(response.conflicts);
      }
      
      vscode.window.showInformationMessage(
        `Synced ${response.synced.length} snippets`
      );
      
    } catch (error) {
      this.logger.error('Sync failed', error);
      // 失败不报错，下次重试
    } finally {
      this.syncing = false;
    }
  }
  
  private async handleConflicts(conflicts: ConflictInfo[]) {
    for (const conflict of conflicts) {
      const choice = await vscode.window.showWarningMessage(
        `Conflict for snippet: ${conflict.localId}`,
        'Keep Local', 'Use Server', 'Keep Both'
      );
      
      switch (choice) {
        case 'Keep Local':
          // 强制覆盖服务器
          await this.forcePush(conflict.localId);
          break;
        case 'Use Server':
          // 用服务器版本覆盖本地
          await this.pullFromServer(conflict.serverId);
          break;
        case 'Keep Both':
          // 创建副本
          await this.createDuplicate(conflict);
          break;
      }
    }
  }
  
  private async getLastSyncTime(): Promise<number> {
    const context = await vscode.commands.executeCommand('extension.getContext');
    return context.globalState.get('lastSyncTime', 0);
  }
}
```

### 6. 命令处理器集成

```typescript
class CommandHandler {
  private services: ServiceContainer;
  
  constructor(services: ServiceContainer) {
    this.services = services;
  }
  
  async explainSelection() {
    const code = this.getSelectedCode();
    if (!code) {
      vscode.window.showInformationMessage('Please select code to explain');
      return;
    }
    
    // 获取服务
    const aiService = this.services.get<AIService>('ai');
    const uiService = this.services.get<UIService>('ui');
    const platformService = this.services.get<PlatformService>('platform');
    
    // 1. 基础功能：AI解释（始终可用）
    const explanation = await aiService.explainCode(code, {
      language: this.getLanguage(),
      fileName: this.getFileName()
    });
    
    // 2. 增强功能：知识链接（如果平台连接）
    let knowledgeLinks = null;
    if (platformService?.isConnected()) {
      try {
        const knowledgeService = this.services.get<KnowledgeService>('knowledge');
        knowledgeLinks = await knowledgeService?.getLinks(code);
      } catch (error) {
        // 静默失败，不影响基础功能
        this.logger.debug('Failed to get knowledge links', error);
      }
    }
    
    // 3. 统一展示
    uiService.showExplanation({
      code,
      explanation,
      knowledgeLinks,
      canSave: true
    });
  }
  
  async saveToReview() {
    const code = this.getSelectedCode();
    if (!code) {
      vscode.window.showInformationMessage('Please select code to save');
      return;
    }
    
    // 获取服务
    const storage = this.services.get<LocalStorage>('storage');
    const syncService = this.services.get<SyncService>('sync');
    
    // 1. 基础功能：本地保存（始终可用）
    const snippet = await storage.save({
      code,
      language: this.getLanguage(),
      tags: this.extractTags(code),
      filePath: this.getFilePath()
    });
    
    vscode.window.showInformationMessage(`Snippet saved locally: ${snippet.id}`);
    
    // 2. 增强功能：触发同步（如果平台连接）
    if (syncService) {
      // 异步同步，不阻塞用户
      syncService.syncAll().catch(error => {
        this.logger.debug('Background sync failed', error);
      });
    }
  }
  
  async openInLearningPlatform() {
    const platformService = this.services.get<PlatformService>('platform');
    
    if (!platformService?.isConnected()) {
      const choice = await vscode.window.showWarningMessage(
        'Not connected to learning platform',
        'Connect Now', 'Open Anyway'
      );
      
      if (choice === 'Connect Now') {
        await vscode.commands.executeCommand('learnLinker.connectPlatform');
        return;
      } else if (choice === 'Open Anyway') {
        // 打开平台主页
        vscode.env.openExternal(vscode.Uri.parse(this.config.platform.url));
        return;
      }
    }
    
    // 构造深链
    const code = this.getSelectedCode();
    const deepLink = this.buildDeepLink(code);
    vscode.env.openExternal(vscode.Uri.parse(deepLink));
  }
}
```

### 7. 状态管理与UI反馈

```typescript
class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private state: ExtensionState = {
    aiStatus: 'ready',
    platformStatus: 'disconnected',
    snippetCount: 0,
    pendingSyncCount: 0
  };
  
  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.show();
    this.updateDisplay();
  }
  
  updateState(partial: Partial<ExtensionState>) {
    this.state = { ...this.state, ...partial };
    this.updateDisplay();
  }
  
  private updateDisplay() {
    const parts: string[] = [];
    
    // AI状态
    const aiIcon = this.state.aiStatus === 'ready' ? '✅' : '❌';
    parts.push(`${aiIcon} AI`);
    
    // 平台连接状态
    if (this.state.platformStatus === 'connected') {
      parts.push('🔗 Connected');
      
      // 同步状态
      if (this.state.pendingSyncCount > 0) {
        parts.push(`⏳ ${this.state.pendingSyncCount}`);
      } else {
        parts.push('☁️ Synced');
      }
    } else {
      parts.push('📴 Offline');
    }
    
    // 本地片段数
    parts.push(`📝 ${this.state.snippetCount}`);
    
    this.statusBarItem.text = `Learn Linker: ${parts.join(' | ')}`;
    this.statusBarItem.tooltip = this.buildTooltip();
    this.statusBarItem.command = 'learnLinker.showStatus';
  }
  
  private buildTooltip(): string {
    const lines: string[] = [];
    lines.push('Learn Linker Status');
    lines.push('─'.repeat(20));
    lines.push(`AI: ${this.state.aiStatus}`);
    lines.push(`Platform: ${this.state.platformStatus}`);
    lines.push(`Local Snippets: ${this.state.snippetCount}`);
    
    if (this.state.pendingSyncCount > 0) {
      lines.push(`Pending Sync: ${this.state.pendingSyncCount}`);
    }
    
    if (this.state.lastSyncTime) {
      const time = new Date(this.state.lastSyncTime).toLocaleTimeString();
      lines.push(`Last Sync: ${time}`);
    }
    
    return lines.join('\n');
  }
}
```

## 测试策略

### 单元测试

```typescript
describe('AIService', () => {
  it('should work without platform connection', async () => {
    const service = new AIService({ provider: 'openai', apiKey: 'test' });
    const stream = await service.explainCode('console.log("test")');
    expect(stream).toBeInstanceOf(ReadableStream);
  });
});

describe('LocalStorage', () => {
  it('should persist snippets locally', async () => {
    const storage = new LocalStorage(mockContext);
    const snippet = await storage.save({ code: 'test', language: 'js' });
    expect(snippet.id).toBeDefined();
    
    const list = await storage.list();
    expect(list).toHaveLength(1);
  });
});
```

### 集成测试

```typescript
describe('Platform Integration', () => {
  it('should gracefully handle platform disconnection', async () => {
    const handler = new CommandHandler(services);
    
    // 断开平台连接
    services.get('platform').disconnect();
    
    // 基础功能应该仍然工作
    await handler.explainSelection();
    expect(webview.hasExplanation).toBe(true);
    expect(webview.hasKnowledgeLinks).toBe(false);
  });
  
  it('should sync when platform reconnects', async () => {
    const storage = services.get('storage');
    const platform = services.get('platform');
    
    // 离线时保存
    platform.disconnect();
    await storage.save({ code: 'test' });
    
    // 重连后应该自动同步
    await platform.connect();
    await waitFor(() => storage.list({ isDirty: false }));
    
    const clean = await storage.list({ isDirty: false });
    expect(clean).toHaveLength(1);
  });
});
```

## 部署配置

### 开发环境

```json
{
  "learnLinker.ai.provider": "openai",
  "learnLinker.ai.apiKey": "${env:OPENAI_API_KEY}",
  "learnLinker.ai.model": "gpt-4o-mini",
  "learnLinker.platform.enabled": false,
  "learnLinker.debug": true
}
```

### 生产环境

```json
{
  "learnLinker.ai.provider": "openai",
  "learnLinker.ai.apiKey": "<user-provided>",
  "learnLinker.platform.enabled": true,
  "learnLinker.platform.url": "https://learn.example.com",
  "learnLinker.platform.features.autoSync": true
}
```

## 监控与调试

### 日志级别

```typescript
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

class Logger {
  log(level: LogLevel, message: string, ...args: any[]) {
    if (level <= this.currentLevel) {
      const timestamp = new Date().toISOString();
      const formatted = `[${timestamp}] [${LogLevel[level]}] ${message}`;
      
      // 输出到VS Code输出面板
      this.outputChannel.appendLine(formatted);
      
      // 开发模式下同时输出到控制台
      if (this.debugMode) {
        console.log(formatted, ...args);
      }
    }
  }
}
```

### 性能监控

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.record(name, duration);
      
      if (duration > 1000) {
        this.logger.warn(`Slow operation: ${name} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(`${name}_error`, duration);
      throw error;
    }
  }
  
  private record(name: string, duration: number) {
    const metrics = this.metrics.get(name) || [];
    metrics.push(duration);
    
    // 保留最近100个记录
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    this.metrics.set(name, metrics);
  }
  
  getStats(name: string) {
    const metrics = this.metrics.get(name) || [];
    if (metrics.length === 0) return null;
    
    const sorted = [...metrics].sort((a, b) => a - b);
    return {
      count: metrics.length,
      mean: metrics.reduce((a, b) => a + b, 0) / metrics.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
}
```

## 总结

增量式集成架构确保了Learn-Linker插件的：

1. **独立性**：核心功能不依赖外部平台
2. **可扩展性**：轻松添加新的增强功能
3. **可靠性**：故障隔离和优雅降级
4. **灵活性**：用户自主选择功能组合

这种设计让插件既可以作为独立工具使用，也能与学习平台深度集成，真正实现了"Write once, enhance everywhere"的目标。