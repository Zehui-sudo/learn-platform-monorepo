# Learn Page 分析文档 (更新)

本文档分析了 Learn Page 的组件结构、渲染逻辑以及相关的 Zustand 状态管理。

## 1. Learn Page 组件层级

组件层级结构**没有发生变化**。

```
src/app/(learn)/layout.tsx
├── ResizablePanelGroup (布局容器)
│   ├── LearnNavBar (顶部导航栏)
│   ├── ResizablePanel (可伸缩面板)
│   │   └── NavigationSidebar (左侧课程导航)
│   ├── ResizablePanel (可伸缩面板)
│   │   └── children (页面内容) -> src/app/(learn)/learn/page.tsx
│   │       └── ContentDisplay (核心内容展示)
│   └── ResizablePanel (可伸缩面板)
│       └── AIChatSidebar (右侧AI助手)
```

**简述:**
- `(learn)/layout.tsx` 仍然定义了整个学习页面的三栏式布局。
- `(learn)/learn/page.tsx` 作为 `layout.tsx` 的 `children`，负责触发初始数据加载。
- `ContentDisplay` 组件是实际负责根据当前状态获取并展示课程内容的组件。

## 2. 渲染逻辑与子页面识别

渲染逻辑和子页面识别机制**没有发生变化**。它依然完全由 **Zustand** 进行状态管理，不依赖于 URL 路由参数。

其工作流程如下：

1.  **状态驱动**: `learn/page.tsx` 页面渲染 `<ContentDisplay />` 组件。
2.  **Zustand Store**: `ContentDisplay` 组件连接到 `useLearningStore`，并根据 `currentSection` 状态来显示内容。
3.  **用户交互**: 用户在 `NavigationSidebar` 中点击不同的课程章节。
4.  **Action 调用**: 点击事件触发 `useLearningStore` 中的 `loadSection(sectionId)` action。
5.  **状态更新**: `loadSection` action 异步获取章节内容，然后更新 store 中的 `currentSection` 状态。
6.  **自动重渲染**: `ContentDisplay` 组件订阅了 `currentSection` 状态，状态更新后自动重渲染以显示新内容。

## 3. Zustand (useLearningStore) 状态管理 (已更新)

`useLearningStore` 中增加了与 **Pyodide (WebAssembly Python)** 相关的状态和操作，用于在浏览器中直接运行 Python 代码。

### State (状态) - 新增

-   `pyodideStatus` ('unloaded' | 'loading' | 'ready' | 'error'): 跟踪 Pyodide 的加载状态。
-   `pyodideError` (string | null): 存储 Pyodide 加载或运行过程中发生的错误。

### Actions (操作) - 新增/修改

-   `loadPath(language)`: **(已修改)** 现在当 `language` 为 'python' 时，此 action 会自动触发 `loadPyodide` action 来加载 Pyodide 环境。
-   `loadPyodide()`: **(新增)** 异步加载和初始化 Pyodide 实例，并更新 `pyodideStatus` 和 `pyodideError` 状态。

### 完整的状态和操作列表

#### State (状态)

-   `currentPath` (Object | null): 存储当前语言的学习路径。
-   `currentSection` (Object | null): 存储当前章节的详细内容。
-   `loading` (Object): 指示路径和章节内容的加载状态。
-   `error` (Object): 存储加载过程中发生的错误。
-   `userCodeSnippets` (Object): 存储用户在代码块中编写的代码。
-   `uiState` (Object): 存储UI相关的状态 (如展开的章节、搜索查询)。
-   `chatSessions` (Array): 存储所有的 AI 对话会话。
-   `activeChatSessionId` (string | null): 当前激活的对话 ID。
-   **`pyodideStatus`**: Pyodide 的加载状态。
-   **`pyodideError`**: Pyodide 的错误信息。

#### Actions (操作)

-   `loadPath(language)`: 加载学习路径，并在需要时初始化 Pyodide。
-   `loadSection(sectionId)`: 加载章节内容。
-   `updateUserCode(sectionId, code)`: 更新用户代码。
-   `updateUIState(uiState)`: 更新 UI 状态。
-   `createNewChat()`: 创建新对话。
-   `switchChat(sessionId)`: 切换对话。
-   `deleteChat(sessionId)`: 删除对话。
-   `renameChat(sessionId, newTitle)`: 重命名对话。
-   `addMessageToActiveChat(message)`: 添加消息。
-   **`loadPyodide()`**: 加载 Pyodide。