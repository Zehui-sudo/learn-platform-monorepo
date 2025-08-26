# PRD · IDE 插件与学习平台集成（“练中学”）

更新时间：2025-08-25

TL;DR
- 在 Cursor/VS Code 中圈选真实代码 → 即时解释（SSE 流） → 返回相关知识点链接 → 一键深链跳转到学习平台对应章节 → 代码片段可收录为“错题集”。
- 首版通过 REST + SSE 实现，逐步演进至 WebSocket/MCP；平台端尽量复用现有能力（聊天流式 API、知识链接混合引擎、深链加载、Zustand 流程）。

一、范围与目标
- 目标
  - 在 IDE 中对选区代码完成“实时解释 + 知识点联动 + 错题集收录”的闭环，打通“练中学”路径。
  - 对齐现有学习平台的数据结构与能力，保持低耦合、可渐进改造。
- 非目标
  - 首版不做团队权限/协作、多角色后台与复杂报表。
  - 首版不要求离线模型或企业网关（可后续支持）。
  - 首版不支持所有语言的 AST 深解析（优先 JS/TS，Python 次之，其他排期）。

二、用户画像与核心场景
- 用户画像
  - 初/中级前端工程师：JS/TS 日常编码，常遇到 Promise/异步、DOM、模块化等知识点回忆不全。
  - 进阶用户：在不同项目间迁移，期望快速定位知识点、形成个人错题集复盘。
- 核心场景（User Stories）
  - S1 解释：在 Cursor/VS Code 中选中 Promise 相关代码，触发“Explain Selection”，IDE 面板流式显示解释与要点。
  - S2 跳转：面板展示“相关知识点”标签（如“Promises”），点击打开深链，进入平台对应章节系统复习。
  - S3 收录：点击“Save to Review”，将选区代码保存为错题条目，未来在平台回顾页集中练习。
  - S4 回练：在平台回顾页按语言/知识点/标签筛选错题，重新练习并标记已掌握。
  - S5 跨场景连续性：在平台学习页中勾画内容后，右栏 AI 即时解释；在 IDE 中面对类似片段时能给出同类知识点链接。

三、现有能力可复用点（平台端）
- 流式聊天 API（Edge + SSE）：[`src/app/api/chat/route.ts`](src/app/api/chat/route.ts)
  - Provider 工厂与流式解析（OpenAI/Anthropic/DeepSeek/豆包）：[`src/services/ai/index.ts`](src/services/ai/index.ts)、[`src/services/ai/providers`](src/services/ai/providers)
- 混合知识链接服务（关键词 + 语义嵌入 + 融合）：[`src/services/knowledgeLinkService.ts`](src/services/knowledgeLinkService.ts)、[`src/services/hybridKnowledgeLinkService.ts`](src/services/hybridKnowledgeLinkService.ts)、[`src/services/semanticService.ts`](src/services/semanticService.ts)
- 学习页面/跳转加载与上下文高亮：[`src/app/(learn)/learn/page.tsx`](src/app/(learn)/learn/page.tsx)、[`src/store/learningStore.ts`](src/store/learningStore.ts)
- Markdown/交互式代码渲染、文本勾画与上下文注入：[`src/components/EnhancedMarkdownRenderer.tsx`](src/components/EnhancedMarkdownRenderer.tsx)、[`src/hooks/useTextSelection.ts`](src/hooks/useTextSelection.ts)
- COOP/COEP 已配置（SharedArrayBuffer/模型预加载）：[`next.config.ts`](next.config.ts)

四、系统方案概览
- 首选信道：REST + SSE
  - IDE 插件 → /api/chat：SSE 流式解释
  - IDE 插件 → /api/links：获取相关知识点列表（SectionLink[]）
  - IDE 插件 → /api/snippets：保存错题条目
  - 深链：IDE 打开 /learn?language=...&section=...&highlight=... 进入平台复习
- 可选增强
  - WebSocket：用于多事件推送与更丰富的交互（排期后置）
  - MCP：在平台或中间件实现 MCP Server，IDE 作为 MCP Client 调用（后续统一 IDE 集成层）

架构图（MVP）
```mermaid
flowchart LR
  IDE[Cursor/VS Code 插件] -->|POST (SSE)| ChatAPI[/api/chat]
  IDE -->|POST| LinkAPI[/api/links]
  IDE -->|POST| SnippetAPI[/api/snippets]
  IDE -->|Deep Link| Web[学习平台 /learn]
  Web --> Store[Zustand Store]
  Store --> Hybrid[Hybrid Knowledge Link Service]
  Hybrid --> Semantic[@xenova/transformers]
```

五、接口设计（初版）
1) 已有：POST /api/chat（SSE）
- 入参（示例）：
```json
{
  "messages": [
    { "id": "u1", "sender": "user", "content": "请解释这段代码的异步流程", "timestamp": 0 }
  ],
  "provider": "openai",
  "language": "javascript",
  "contextReference": {
    "text": "const p = fetch(url).then(res => res.json());",
    "source": "IDE:app/routes.ts:12-24",
    "type": "code"
  }
}
```
- 返回：text/event-stream，逐块返回解释增量。端点实现：[`src/app/api/chat/route.ts`](src/app/api/chat/route.ts)

2) 新增：POST /api/links
- 功能：根据代码与上下文返回可能关联的知识点（SectionLink[]）
- 入参：
```json
{
  "code": "const p = fetch(url).then(res => res.json());",
  "language": "javascript",
  "filePath": "app/routes.ts",
  "repo": "sample-repo",
  "astFeatures": ["Promise.then", "fetch", "then-chain"],
  "topK": 5
}
```
- 出参（节选）：
```json
[
  {
    "sectionId": "js-sec-3-3-promises",
    "title": "Promises",
    "chapterId": "js-ch-3-async",
    "chapterTitle": "异步编程",
    "language": "javascript",
    "matchedKeywords": ["promise", "then"],
    "relevanceScore": 0.86,
    "fusedScore": 0.78,
    "matchType": "hybrid",
    "confidence": "high",
    "explanation": "命中关键词 promise/then，语义相似度较高"
  }
]
```
- 实现：服务端复用融合引擎 [`src/services/hybridKnowledgeLinkService.ts`](src/services/hybridKnowledgeLinkService.ts) 与关键词索引 [`src/services/knowledgeLinkService.ts`](src/services/knowledgeLinkService.ts)

3) 新增：POST /api/snippets
- 功能：保存错题集条目（后续在平台 /learn/review 展示）
- 入参：
```json
{
  "code": "const p = fetch(url).then(res => res.json());",
  "language": "javascript",
  "filePath": "app/routes.ts",
  "repo": "sample-repo",
  "relatedSections": ["js-sec-3-3-promises"],
  "tags": ["async", "promise"],
  "note": "then 链式调用与错误处理易漏"
}
```
- 出参：
```json
{ "id": "snip_1735173517", "savedAt": 1735173517123 }
```
- 存储：首版可本地 JSON/SQLite，后续接入数据库（支持用户维度与组织维度）

4) 深链规范
- 基本格式：
  - /learn?language={python|javascript}&section={sectionId}&highlight={urlEncodedSnippet}
- 页面加载行为：
  - 根据 language 调用 [`loadPath`](src/store/learningStore.ts) 加载路径
  - 根据 section 调用 [`loadSection`](src/store/learningStore.ts) 加载内容
  - 将 highlight 文本传递给 [`setSelectedContent`](src/store/learningStore.ts) 用于高亮显示/右栏提示

5) 鉴权与安全
- 鉴权：建议使用 PAT（Personal Access Token），由平台生成，IDE 存储在 SecretStorage
- 请求头：Authorization: Bearer <PAT>
- CORS：允许指定源（本地开发或特定域），生产限制严谨
- 限速：对 /api/chat、/api/links、/api/snippets 进行速率限制与审计

六、数据模型（建议）
- 已有：SectionLink（参见 [`src/types/index.ts`](src/types/index.ts)）
- 新增：Snippet（建议）
```ts
type Snippet = {
  id: string;
  code: string;
  language: 'javascript' | 'python';
  filePath?: string;
  repo?: string;
  relatedSections?: string[]; // Section.sectionId[]
  tags?: string[];
  note?: string;
  savedAt: number;
  userId?: string;
};
```
- AST 特征（建议）
```ts
type AstFeature =
  | 'Promise.then'
  | 'Promise.catch'
  | 'Promise.finally'
  | 'async/await'
  | 'Promise.all'
  | 'Promise.race'
  | 'fetch'
  | 'AbortController'
  | 'microtask'
  | 'event-loop'
  | 'try/catch'
  | 'callback-style';
```

七、IDE 插件设计（Cursor/VS Code）
- 命令
  - Explain Selection：调用 /api/chat（SSE）与 /api/links，并在面板渲染解释+链接
  - Save to Review：调用 /api/snippets 保存条目
  - Open in Learning Platform：深链打开平台学习页
- 面板与交互
  - SSE 流式解释（断线重连/取消）
  - 链接列表（点击跳转；hover 展示节概览）
  - 按钮：Save to Review / Open in Learning Platform
- 设置
  - 平台地址（默认 http://localhost:3000）
  - PAT/Token
  - 发送策略：仅摘要/包含原始代码（默认仅摘要）
  - Provider 选择（可沿用平台端）
- AST 提取（可渐进增强）
  - JS/TS：TypeScript Compiler API/Babel（抽取 Promise/async 相关模式与函数符号）
  - Python：ast/Jedi 提取 async/await/asyncio 使用
- 鉴权与存储
  - VS Code SecretStorage 存储 PAT，网络请求注入 Authorization
- 兼容性
  - Cursor/VS Code 共用代码结构（共享核心逻辑，适配不同扩展 API）

八、非功能需求（NFR）
- 性能
  - /api/links：P95 < 400ms（命中缓存/索引后的常见查询）
  - /api/chat：首 token < 1.5s（视 Provider 与网络），流式增量 < 200ms 间隔
- 可用性
  - 插件与平台出现网络错误可回退为仅本地解释摘要（可选）
- 可靠性
  - 日志审计/限流/告警（平台侧）；插件侧错误提示清晰可追踪
- 安全与隐私
  - 默认仅发送摘要/特征，原文上传由用户手动确认
  - PAT 权限可单独吊销，支持失效时间与最小权限

九、里程碑与交付
- Phase 0（平台增量 API）：约 1~2 天
  - 新增 /api/links、/api/snippets（JSON/SQLite 存储占位）
  - 学习页支持深链参数 section、highlight
- Phase 1（插件 MVP）：约 3~5 天
  - 命令 Explain Selection（SSE 渲染 + 链接）、Save to Review、Open in Learning Platform
  - 设置页：平台地址、PAT、发送策略
- Phase 2（平台回顾页）：约 2~4 天
  - /learn/review 列表与聚合筛选（按语言/标签/知识点）
  - 重新练习并标注掌握
- Phase 3（AST 语义增强）：约 3~7 天
  - 插件侧 AST/类型分析、特征提取与权重优化
  - 平台融合权重/阈值调优（[`src/services/hybridKnowledgeLinkService.ts`](src/services/hybridKnowledgeLinkService.ts)）
- Phase 4（体验与规模化）：约 3~5 天
  - 断线重连、重试策略、缓存命中率优化
  - 组织/团队模式的进一步规划（后续 PRD）

十、成功指标（Metrics）
- 解释触发次数/日、成功率（SSE 正常完成）
- 链接点击率、深链到达率
- 错题条目新增量、回练完成率
- 平均响应时间（/api/links、首 token）
- 用户留存（7/30 日）、功能复用率

十一、风险与对策
- 误链与噪声
  - 对策：插件侧 AST 特征 + 平台融合阈值 0.65（可调），提供“不是我想要”反馈机制
- SSE 在代理/CDN 下的兼容性
  - 对策：提供“降级为非流式”开关；文档指引代理配置
- 隐私合规
  - 对策：默认摘要模式；PAT/最小权限；可提供私有部署指南（关闭公网 Provider，走内网）
- 冷启动与模型加载
  - 对策：平台空闲预加载（已有 [`src/components/SemanticModelPreloader.tsx`](src/components/SemanticModelPreloader.tsx)），API 端缓存索引

十二、实施清单（工程任务）
- 平台端
  - 新增路由：
    - /api/links：`src/app/api/links/route.ts`（new）→ 调用融合服务 identifyLinks
    - /api/snippets：`src/app/api/snippets/route.ts`（new）→ 保存/读取 Snippet
  - 学习页深链解析：在 [`src/app/(learn)/learn/page.tsx`](src/app/(learn)/learn/page.tsx) 解析 section、highlight；在 [`src/store/learningStore.ts`](src/store/learningStore.ts) 内调用 `loadPath`、`loadSection`、`setSelectedContent`
  - （可选）/learn/review 新增页面与状态扩展
- 插件端
  - 命令注册：Explain Selection、Save to Review、Open in Learning Platform
  - SSE 处理、链接渲染、PAT 管理（SecretStorage）
  - AST 抽取（JS/TS 优先；Python 后续）
  - 配置页/状态存储/日志

十三、开放问题（Open Questions）
- PAT 生成/撤销是否放在设置页？（建议：[`src/app/settings/page.tsx`](src/app/settings/page.tsx) 新增区块）
- /api/links 是否支持跨语言（当 language 缺失时）？（建议：初版仅按 IDE 语言过滤，后续放宽）
- 错题条目是否需要多用户？（建议：初版仅本机/单用户；后续接入用户体系）

十四、附录：示例深链与测试用例
- 深链示例
  - http://localhost:3000/learn?language=javascript&section=js-sec-3-3-promises&highlight=const%20p%20%3D%20fetch(url).then(res%20%3D%3E%20res.json())%3B
- 基础测试
  - IDE 解释能否在 1.5s 内返回首 token（网络正常）
  - /api/links 对 Promise 片段能否稳定返回 “Promises” 节点（score >= 阈值）
  - Save to Review 可生成条目并在平台回顾页展示
  - 深链进入学习页后，章节正确加载与高亮展示

十五、变更记录
- 2025-08-25 首版草案：定义范围/接口/数据结构/路线，面向 MVP 落地与渐进增强。