# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing two interconnected projects for an interactive learning platform:

- **web-learner**: Next.js 15.4.2 web application providing an interactive learning platform with AI assistance
- **learn-linker**: VS Code extension that connects code editing with the learning platform

The projects work together to create an integrated development learning experience where users can learn through the web interface and get contextual assistance while coding in VS Code.

## Tech Stack

### Web Learner (Next.js App)
- **Framework**: Next.js 15.4.2 with App Router
- **Language**: TypeScript
- **State Management**: Zustand 5.x
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **Code Execution**: Pyodide for Python, Function sandbox for JavaScript
- **AI Integration**: Multiple providers (OpenAI, Anthropic, DeepSeek, Doubao)

### Learn Linker (VS Code Extension)  
- **Platform**: VS Code Extension API
- **Language**: TypeScript
- **Build Tool**: Webpack
- **State Management**: Zustand 4.x
- **API Client**: Axios with SSE support

## Development Commands

### Monorepo Root Commands
```bash
# Install all dependencies
pnpm install:all

# Development
pnpm dev:web      # Start web app dev server
pnpm dev:linker   # Watch VS Code extension
pnpm dev:all      # Run both in parallel

# Build
pnpm build:web    # Build web app
pnpm build:linker # Package VS Code extension  
pnpm build        # Build all packages

# Quality
pnpm lint         # Lint all packages
pnpm test         # Run all tests
```

### Package-Specific Commands

#### Web Learner
```bash
cd web-learner
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run linter
```

#### Learn Linker
```bash
cd learn-linker
pnpm compile      # Compile TypeScript
pnpm watch        # Watch mode development
pnpm package      # Create production VSIX
pnpm lint         # Run linter
pnpm test         # Run extension tests
```

## Architecture Overview

### Monorepo Structure
```
/
├── package.json           # Root package with monorepo scripts
├── pnpm-workspace.yaml    # PNPM workspace configuration
├── web-learner/          # Next.js learning platform
└── learn-linker/         # VS Code extension
```

### Web Learner Architecture
- **Three-Column Layout**: Resizable panels with navigation sidebar, content area, and AI chat
- **Learning System**: Dynamic content loading from Markdown files with progress tracking
- **AI Chat**: Multi-provider support with streaming responses and context referencing
- **Code Execution**: Interactive code blocks with Pyodide (Python) and sandboxed JS execution
- **Knowledge Linking**: Hybrid keyword + semantic search for content recommendations

Key files:
- `src/app/(learn)/layout.tsx`: Three-column learning layout
- `src/store/learningStore.ts`: Global state management
- `src/services/ai/`: AI provider implementations
- `src/services/pyodideService.ts`: Python execution service
- `src/components/AIChatSidebar.tsx`: AI chat interface

### Learn Linker Architecture
- **Command System**: VS Code commands for code explanation and platform integration
- **API Integration**: Connects to web platform via configurable API endpoints
- **Configuration**: User settings for platform URL, auth tokens, and AI providers
- **Error Handling**: Centralized error management with logging

Key files:
- `src/extension.ts`: Extension entry point
- `src/core/commandHandler.ts`: Command implementations
- `src/services/api/`: API client and SSE handling
- `src/config/`: Settings and secrets management

## Communication Between Projects

The VS Code extension communicates with the web platform through:
1. REST API endpoints for sending code/context
2. SSE (Server-Sent Events) for streaming AI responses
3. Configurable platform URL (default: http://localhost:3000)
4. Personal Access Token authentication

## Environment Configuration

### Web Learner (.env.local)
```bash
# AI Provider Keys (configure as needed)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-deepseek-...
DOUBAO_API_KEY=volc-...
```

### Learn Linker (VS Code Settings)
Configure through VS Code settings or `learn-linker.showSettings` command:
- `learnLinker.platformUrl`: Platform URL
- `learnLinker.personalAccessToken`: Auth token
- `learnLinker.provider`: AI provider selection
- `learnLinker.sendStrategy`: Code sending strategy

## Key Implementation Notes

### Web Learner
- Uses Next.js App Router with React Server Components
- COOP/COEP headers configured for SharedArrayBuffer (required by Pyodide)
- Content stored in `public/content/` as Markdown files
- Learning paths defined in `public/javascript-learning-path.md`
- State persisted to localStorage via Zustand

### Learn Linker
- Activates on VS Code startup (`onStartupFinished`)
- Commands available in editor context menu when text is selected
- Singleton pattern for service instances
- Webpack bundling with external VS Code modules

## Testing Approach

- Web Learner: Manual testing via development server
- Learn Linker: VS Code extension test framework with `@vscode/test-cli`

Run extension tests:
```bash
cd learn-linker
pnpm test
```

## Common Development Tasks

### Adding a New AI Provider
1. Create provider implementation in `web-learner/src/services/ai/providers/`
2. Register in `web-learner/src/services/ai/index.ts`
3. Add environment variables to `.env.local`
4. Update provider selection in Learn Linker settings schema

### Adding New Learning Content
1. Create Markdown file in `web-learner/public/content/`
2. Update learning path in `public/javascript-learning-path.md` or Python mock data
3. Use `:interactive` suffix for executable code blocks

### Modifying VS Code Extension Commands
1. Define command in `learn-linker/package.json` contributes section
2. Implement handler in `src/core/commandHandler.ts`
3. Register in `src/extension.ts` activate function