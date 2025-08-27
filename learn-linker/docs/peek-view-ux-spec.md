# Learn Linker: Peek-View-Centric UI/UX Design Specification (v2)

## 1. 核心设计理念

本方案旨在为 `learn-linker` 插件的核心功能（代码解释、知识点匹配、代码保存）提供一个无缝、直观且干扰性极低的UI/UX。

遵循以下设计原则：

- **编辑器优先 (Editor-First)**: 尽可能将用户的操作和视线维持在代码编辑器内部，避免不必要的面板跳转和上下文切换。
- **渐进式揭示 (Progressive Disclosure)**: 只在最相关的时机呈现必要的操作选项，避免信息过载，保持界面清爽。
- **实时反馈 (Live Feedback)**: 通过流式输出来替代静态加载，提供即时、动态的交互体验。

## 2. 核心交互模型

采用以 **CodeLens** 作为单一入口，驱动一个内联的 **Peek View (悬浮窗口)** 来承载完整交互流程的核心模型。

- **主要交互**: `CodeLens -> Peek View`，处理最高频的“解释-学习-保存”流程。
- **备用交互**: 保留`命令面板`和`右键菜单`作为直接访问“保存”等功能的备用通道，服务于高级用户。

## 3. 详细用户工作流

### 第1步: 触发入口 (CodeLens)

- **触发时机**: 当用户光标聚焦于一个函数/类/代码块，或手动选中一段代码时。
- **UI表现**: 在代码块正上方出现一行简洁的文本链接。

**模拟视图:**
```typescript
// CodeLens: 一个简洁、无歧义的入口点
// Learn Linker: ✨ Explain

function aComplexFunction(arg1, arg2) {
  // ... function body ...
}
```

### 第2步: 打开Peek View并流式输出解释

- **触发时机**: 用户点击 `✨ Explain` CodeLens。
- **UI表现**:
    1. 一个内联的悬浮窗口（Peek View）从代码下方平滑展开。
    2. Peek View **立即开始流式输出 (Streaming)** AI的解释。解释区的文本会逐字出现，并带有一个闪烁的光标，提供实时的打字机效果。

**流式输出状态模拟:**
```
┌──────────────────────────────────────────────┐
│ 📄 Explanation: aComplexFunction() [Esc to close] │
│ ────────────────────────────────────────────── │
│                                              │
│ #### Explanation                             │
│ This function is designed to handle user data│
│ by first validating the input, then...█      │
│ (文本正在逐字动态加载)                         │
│                                              │
└──────────────────────────────────────────────┘
```

### 第3步: 展示最终结果与后续操作

- **触发时机**: AI文本流完全结束后。
- **UI表现**: **“Knowledge Links”** 和 **“Save to Collection”** 按钮在解释文稿的下方平滑浮现，代表流程已完成，可以进行下一步操作。

**最终界面模拟:**
```
┌──────────────────────────────────────────────┐
│ 📄 Explanation: aComplexFunction() [Esc to close] │
│ ────────────────────────────────────────────── │
│                                              │
│ #### Explanation                             │
│ This function is designed to handle user data│
│ by first validating the input, then making an│
│ asynchronous call to fetch more details.     │
│                                              │
│ ---                                          │
│                                              │
│ #### Related Knowledge                       │
│  ┌──────────────────────────┐                │
│  │ 🔗 Asynchronous Programming │ (Clickable)    │
│  └──────────────────────────┘                │
│  ┌──────────────────────────┐                │
│  │ 🔗 Closures in JavaScript │ (Clickable)    │
│  └──────────────────────────┘                │
│                                              │
│ ---                                          │
│                                              │
│  ┌──────────────────────────┐                │
│  │    💾 Save to Collection   │ (Clickable)    │
│  └──────────────────────────┘                │
│                                              │
└──────────────────────────────────────────────┘
```

## 4. 技术实现方案

### a. Peek View UI 开发

- **推荐框架**: **使用React (或Vite, Svelte等)** 来构建Peek View的前端界面。这是官方推荐的最佳实践。
- **工作流程**:
    1. 在插件项目中创建独立的UI子目录 (e.g., `src/webview-ui`)。
    2. 在该目录中，使用React技术栈开发组件化、可交互的UI界面。
    3. 通过Vite/Webpack等工具将React应用编译为静态的`index.html`, `bundle.js`, `styles.css`文件。
    4. 在插件主程序中，读取编译后的`index.html`，处理资源路径后，将其内容加载到`Webview`中。

### b. 流式响应 (Streaming)

- **实现方式**: AI Service需要支持流式响应（Server-Sent Events或类似的流式HTTP响应）。
- **通信**: 插件后端接收到AI的流式数据块后，通过`webview.postMessage()`持续地将这些数据块（token）发送给Peek View中的React应用，由React应用负责将它们追加到DOM中，实现打字机效果。

### c. 备用访问通道（暂时先不进行额外开发）

为了满足用户直接保存而不经过解释的需求，以下入口应予以保留：

1.  **编辑器右键菜单**: 选中代码后右键，菜单中应包含 "Learn Linker: Save Snippet"。
2.  **命令面板 (Ctrl/Cmd + Shift + P)**: 应能搜索并执行 "Learn Linker: Save Snippet" 命令。
