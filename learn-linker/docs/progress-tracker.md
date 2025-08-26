# Learn-Linker IDE 插件开发进度追踪

## 项目概述

Learn-Linker 是一个VS Code扩展插件，旨在连接代码与学习平台，实现"练中学"的学习体验。用户可以在IDE中选中代码进行解释，获取相关知识点链接，并能够保存代码片段到错题集。

## 开发阶段

### Phase 0: 基础框架和配置管理 (预计1-2天)

**目标**: 实现插件基础架构，包括配置管理和基本的命令注册框架。

#### 任务清单

- [x] 分析PRD文档，明确IDE插件需要实现的核心功能
- [x] 设计IDE插件的架构和组件结构
- [x] 实现插件基础框架和配置管理
- [x] 创建进度追踪文档
- [x] 实现核心模块基础结构
- [x] 实现配置管理（平台地址、PAT等）
- [x] 实现基本的命令注册框架

#### 进度详情

**2025-08-26**
- [x] 完成了PRD文档分析，明确了核心功能需求
- [x] 设计了插件架构，包括核心模块、UI模块、服务模块和配置模块
- [x] 创建了进度追踪文档
- [x] 更新了package.json，添加了必要的依赖项和命令配置
- [x] 实现了配置管理模块（settings.ts, secrets.ts, workspace.ts）
- [x] 实现了工具模块（logger.ts, errors.ts, helpers.ts）
- [x] 实现了服务模块（api/types.ts, api/client.ts, api/sseHandler.ts, auth/manager.ts）
- [x] 实现了核心模块（commandHandler.ts）
- [x] 更新了主入口文件，集成了所有模块

### Phase 1: 核心功能MVP (预计3-5天)

**目标**: 实现核心功能的最小可行产品，包括代码解释、保存错题和深链跳转。

#### 任务清单

- [ ] 实现"Explain Selection"命令（代码解释功能）
- [ ] 实现"Save to Review"命令（保存错题功能）
- [ ] 实现"Open in Learning Platform"命令（深链跳转功能）
- [ ] 实现SSE流式解释的UI面板

### Phase 2: 知识点链接和跳转 (预计2-4天)

**目标**: 实现知识点链接的获取、展示和跳转功能。

#### 任务清单

- [ ] 实现知识点链接获取和展示
- [ ] 实现深链跳转功能
- [ ] 实现错题集树视图

### Phase 3: AST分析和增强 (预计3-7天)

**目标**: 实现AST特征提取，优化知识点匹配算法。

#### 任务清单

- [ ] 实现AST特征提取（JS/TS优先）
- [ ] 优化知识点匹配算法
- [ ] 实现更智能的代码分析

### Phase 4: 体验优化和规模化 (预计3-5天)

**目标**: 优化用户体验和性能，完善测试和文档。

#### 任务清单

- [ ] 添加错误处理和重试机制
- [ ] 优化性能和用户体验
- [ ] 完善测试和文档

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                        │
├─────────────────┬─────────────────┬─────────────────┬─────────┤
│   Core Module   │    UI Module    │  Service Module │ Config  │
├─────────────────┼─────────────────┼─────────────────┼─────────┤
│ Command Handler │  Webview Panel  │   API Client    │ Settings│
│  AST Analyzer   │   Tree View     │  SSE Handler    │ Secrets │
│Context Manager  │   Status Bar    │  Auth Manager   │Workspace│
└─────────────────┴─────────────────┴─────────────────┴─────────┘
```

### 文件结构

```
src/
├── extension.ts                 # 主入口文件
├── core/                       # 核心模块
│   ├── commandHandler.ts       # 命令处理器
│   ├── astAnalyzer.ts         # AST分析器
│   └── contextManager.ts      # 上下文管理器
├── ui/                         # UI模块
│   ├── webview/               # Webview相关
│   ├── tree/                  # 树视图
│   └── status/                # 状态栏
├── services/                   # 服务模块
│   ├── api/                   # API相关
│   ├── auth/                  # 认证相关
│   └── storage/               # 存储相关
├── config/                     # 配置模块
│   ├── settings.ts            # 设置管理
│   ├── secrets.ts             # 密钥管理
│   └── workspace.ts           # 工作区配置
├── utils/                      # 工具函数
└── test/                       # 测试文件
```

## 核心功能

### 1. 代码解释功能
- 用户在IDE中选中代码
- 插件调用学习平台的API进行解释
- 以流式方式展示解释结果

### 2. 知识点链接推荐
- 基于选中的代码，推荐相关的学习知识点
- 提供一键跳转到学习平台的功能

### 3. 错题集收藏
- 用户可以将代码片段保存到错题集中
- 方便后续复习和练习

### 4. 深链跳转
- 从IDE插件直接跳转到学习平台的特定章节
- 高亮相关代码，提供上下文

## API集成

### 必需的API端点

1. **POST /api/chat** (SSE)
   - 功能：流式代码解释
   - 输入：代码片段、上下文信息
   - 输出：流式解释文本

2. **POST /api/links**
   - 功能：获取相关知识点链接
   - 输入：代码片段、语言信息
   - 输出：相关知识点列表

3. **POST /api/snippets**
   - 功能：保存错题条目
   - 输入：代码片段、相关信息
   - 输出：保存结果

### 深链格式

```
/learn?language={python|javascript}&section={sectionId}&highlight={urlEncodedSnippet}
```

## 配置项

### 用户配置
- 平台地址（默认 http://localhost:3000）
- PAT/Token（用于API认证）
- 发送策略（仅摘要/包含原始代码）
- Provider选择（可沿用平台端）

### 工作区配置
- 项目特定设置
- 语言特定配置

## 开发环境

### 技术栈
- VS Code Extension API
- TypeScript
- Webpack（用于构建）
- Node.js

### 开发命令
```bash
npm run compile     # 编译TypeScript
npm run watch       # 监听模式编译
npm run package     # 打包扩展
npm run lint        # 代码检查
npm run test        # 运行测试
```

## 注意事项

1. **安全性**
   - PAT令牌安全存储
   - 代码片段隐私保护
   - API请求加密

2. **性能**
   - SSE流式处理
   - 缓存策略
   - 异步操作

3. **兼容性**
   - 支持VS Code和Cursor
   - 跨平台兼容性

## 更新日志

### 2025-08-26
- 创建项目进度追踪文档
- 完成PRD文档分析和架构设计
- 制定开发计划和里程碑