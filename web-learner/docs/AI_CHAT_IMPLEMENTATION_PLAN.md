# AI Chat 实现方案

## 项目背景
当前项目中的 AI 聊天功能使用模拟数据实现，需要升级为真实的 AI API 集成，支持与多个主流 AI 模型进行实际对话。

## 现状分析

### 当前实现
- **组件位置**: `/src/components/AIChatSidebar.tsx`
- **实现方式**: 使用 `generateAIResponse` 函数生成模拟响应
- **功能特性**:
  - 多会话管理
  - 上下文引用
  - 消息历史记录
  - 基于关键词的模拟回复

### 技术栈
- Next.js 15.4.2 (App Router)
- TypeScript
- Zustand (状态管理)
- React Hook Form + Zod

## 技术方案

### 支持的 AI 模型提供商
1. **OpenAI** - GPT-4/GPT-3.5
2. **Anthropic** - Claude 3
3. **DeepSeek** - DeepSeek Chat
4. **豆包 (Doubao)** - 字节跳动 AI

### 架构设计

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ AIChatSidebar   │────▶│ API Route        │────▶│ AI Services     │
│ Component       │     │ /api/chat        │     │ Abstract Layer  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                 │
         │                                                 ▼
         │                                        ┌─────────────────┐
         │                                        │ AI Providers    │
         ▼                                        ├─────────────────┤
┌─────────────────┐                              │ • OpenAI        │
│ Zustand Store   │                              │ • Anthropic     │
│ learningStore   │                              │ • DeepSeek      │
└─────────────────┘                              │ • Doubao        │
                                                 └─────────────────┘
```

## 实施计划

### 第一阶段：基础架构搭建

#### 1. 创建 API 路由
**文件**: `/src/app/api/chat/route.ts`

```typescript
// 主要功能:
- 处理 POST 请求
- 验证请求参数
- 路由到相应的 AI 服务
- 支持流式响应 (SSE)
- 统一错误处理
```

#### 2. 创建 AI 服务层
**目录结构**:
```
/src/services/ai/
├── index.ts              # 导出统一接口
├── aiChatService.ts      # 服务抽象类
├── types.ts              # AI 服务相关类型
└── providers/
    ├── openai.ts         # OpenAI 实现
    ├── anthropic.ts      # Claude 实现
    ├── deepseek.ts       # DeepSeek 实现
    └── doubao.ts         # 豆包实现
```

#### 3. 类型定义增强
**文件**: `/src/types/index.ts`

```typescript
// 新增类型:
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
  DOUBAO = 'doubao'
}

export interface ChatAPIRequest {
  messages: ChatMessage[]
  provider: AIProvider
  model?: string
  stream?: boolean
  temperature?: number
  maxTokens?: number
  contextReference?: ContextReference
}

export interface ChatAPIResponse {
  content: string
  provider: AIProvider
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  error?: {
    code: string
    message: string
  }
}

export interface StreamChunk {
  id: string
  content: string
  done: boolean
  error?: string
}
```

### 第二阶段：组件和状态更新

#### 4. Zustand Store 增强
**文件**: `/src/store/learningStore.ts`

```typescript
// 新增状态:
interface LearningStore {
  // ... 现有状态
  
  // AI 相关状态
  aiProvider: AIProvider
  aiConfig: {
    temperature: number
    maxTokens: number
    streamEnabled: boolean
  }
  streamingMessageId: string | null
  
  // AI 相关 actions
  setAIProvider: (provider: AIProvider) => void
  updateAIConfig: (config: Partial<AIConfig>) => void
  sendChatMessage: (content: string, contextRef?: ContextReference) => Promise<void>
  cancelStreaming: () => void
}
```

#### 5. 更新 AIChatSidebar 组件
**文件**: `/src/components/AIChatSidebar.tsx`

主要改动:
- 添加 AI 提供商选择器 UI
- 替换模拟响应为真实 API 调用
- 实现流式响应渲染
- 添加加载和错误状态
- 支持取消请求

### 第三阶段：配置和优化

#### 6. 环境变量配置
**文件**: `.env.local`

```bash
# OpenAI 配置
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_API_BASE=https://api.openai.com/v1

# Anthropic Claude 配置
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-opus-20240229
ANTHROPIC_API_BASE=https://api.anthropic.com

# DeepSeek 配置
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_API_BASE=https://api.deepseek.com

# 豆包配置
DOUBAO_API_KEY=...
DOUBAO_MODEL=doubao-lite-4k
DOUBAO_API_BASE=https://maas-api.ml-platform-cn-beijing.volces.com

# 通用配置
AI_DEFAULT_PROVIDER=openai
AI_REQUEST_TIMEOUT=30000
AI_MAX_RETRIES=3
```

#### 7. 错误处理和重试机制
- 实现指数退避重试
- 添加请求超时处理
- 用户友好的错误提示
- 降级到模拟响应（可选）

## 实现细节

### DeepSeek 集成
DeepSeek 提供兼容 OpenAI 格式的 API，实现相对简单：

```typescript
// /src/services/ai/providers/deepseek.ts
class DeepSeekProvider extends AIProvider {
  async chat(request: ChatAPIRequest): Promise<ChatAPIResponse> {
    // 使用 OpenAI 客户端，修改 baseURL
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1'
    });
    // ... 实现逻辑
  }
}
```

### 豆包集成
豆包 API 需要特殊的认证和请求格式：

```typescript
// /src/services/ai/providers/doubao.ts
class DoubaoProvider extends AIProvider {
  async chat(request: ChatAPIRequest): Promise<ChatAPIResponse> {
    // 豆包特定的 API 调用实现
    // 需要处理特殊的认证头和请求格式
  }
}
```

## 功能特性

### 核心功能
1. **多模型切换** - 用户可在对话中切换不同的 AI 提供商
2. **流式响应** - 实时显示 AI 生成的内容，提升用户体验
3. **上下文引用** - 保留并增强现有的上下文引用功能
4. **会话管理** - 保持现有的多会话功能

### 高级功能
1. **Token 使用统计** - 显示每次对话的 token 使用量
2. **成本追踪** - 根据不同模型的定价计算使用成本
3. **响应缓存** - 缓存相同问题的响应，减少 API 调用
4. **导出功能** - 支持导出对话历史

### 安全考虑
1. **API 密钥管理** - 所有密钥存储在服务端环境变量中
2. **请求验证** - 验证请求来源和格式
3. **速率限制** - 实现请求频率限制
4. **内容过滤** - 过滤敏感信息

## 测试计划

### 单元测试
- AI 服务层各个 provider 的测试
- API 路由的请求/响应测试
- Zustand store 的状态更新测试

### 集成测试
- 端到端的聊天功能测试
- 流式响应测试
- 错误处理和重试测试

### 性能测试
- 并发请求处理
- 长对话的性能表现
- 内存使用优化

## 部署注意事项

1. **环境变量** - 确保所有 API 密钥正确配置
2. **CORS 设置** - 配置正确的跨域策略
3. **错误监控** - 集成错误追踪服务
4. **日志记录** - 记录 API 调用和错误信息

## 时间估算

- 第一阶段（基础架构）: 2-3 天
- 第二阶段（组件更新）: 2-3 天
- 第三阶段（配置优化）: 1-2 天
- 测试和调试: 2-3 天

**总计**: 7-11 天

## 风险和缓解措施

1. **API 限制** - 实现请求队列和速率限制
2. **成本控制** - 添加使用量警告和限制
3. **网络问题** - 实现离线模式和缓存
4. **模型差异** - 统一响应格式，处理特殊情况

## 后续优化

1. **插件系统** - 支持自定义 AI 提供商
2. **本地模型** - 集成本地运行的 LLM
3. **多模态支持** - 支持图片和文件上传
4. **协作功能** - 多用户共享对话