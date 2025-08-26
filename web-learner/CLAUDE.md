# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 15.4.2 dashboard application using TypeScript, Tailwind CSS, and shadcn/ui components. The app features:
- A main dashboard page for project statistics and overview.
- An interactive learning platform with dynamic content, progress tracking, and navigation.
- AI-powered chat sidebar for learning assistance.
- Code execution capabilities with Pyodide for Python.
- Responsive three-column layout for learning content.

## Tech Stack

- **Framework**: Next.js 15.4.2 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.x with CSS variables
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: Zustand for global state (learning progress, chat sessions)
- **Form Handling**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Font**: Inter (via next/font)
- **Code Execution**: Pyodide for in-browser Python execution
- **Markdown Rendering**: react-markdown with remark-gfm and rehype-katex
- **AI Integration**: Multiple providers (OpenAI, Anthropic, DeepSeek, Doubao)
- **Layout**: react-resizable-panels for resizable column layout

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint

# Install dependencies
npm install
```

## Project Structure

```
src/
├── app/                           # App Router pages
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Dashboard overview page
│   ├── (learn)/                   # Learning platform pages (route group)
│   │   ├── layout.tsx             # Learning platform layout with three-column design
│   │   └── learn/page.tsx         # Learning content page
│   └── api/
│       └── chat/route.ts          # AI chat API endpoint
├── components/
│   ├── PageLayout.tsx             # Main page layout component
│   ├── LearnNavBar.tsx            # Navigation bar for the learning platform
│   ├── NavigationSidebar.tsx      # Sidebar navigation for learning content
│   ├── ContentDisplay.tsx         # Main content display component
│   ├── AIChatSidebar.tsx          # AI chat sidebar component
│   ├── EnhancedMarkdownRenderer.tsx # Markdown renderer with enhanced features
│   ├── InteractiveCodeBlock.tsx   # Interactive code block with execution
│   ├── ContextReference.tsx       # Context reference display component
│   └── ui/                        # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dropdown-menu.tsx
│       ├── progress.tsx
│       ├── select.tsx
│       └── tooltip.tsx
├── lib/
│   └── utils.ts                   # Helper utilities (cn function)
├── store/
│   └── learningStore.ts           # Zustand store for learning state
├── services/
│   ├── pyodideService.ts          # Pyodide service for code execution
│   └── ai/                        # AI service implementations
│       ├── index.ts
│       ├── types.ts
│       └── providers/             # AI provider implementations
│           ├── openai.ts
│           ├── anthropic.ts
│           ├── deepseek.ts
│           └── doubao.ts
├── hooks/
│   └── useTextSelection.ts        # Text selection hook
└── types/
    └── index.ts                   # TypeScript type definitions
```

## Key Architecture Notes

- **App Router**: Uses Next.js 15 App Router with RSC (React Server Components).
- **State Management**: Global state for the learning platform and chat is managed by `zustand` with persistence.
- **Dynamic Routing**: The learning platform uses route groups for organization.
- **Path Aliases**: `@/*` maps to `./src/*`.
- **Client Components**: Components requiring interactivity (forms, learning platform, chat) use `"use client"`.
- **Styling**: Tailwind CSS with CSS variables defined in `globals.css`.
- **AI Integration**: Multiple AI providers supported through a unified service interface.
- **Code Execution**: Pyodide integration for in-browser Python code execution.
- **Layout**: Three-column resizable layout for learning content using react-resizable-panels.

## Component Patterns

- **LearnNavBar**: A dedicated navigation component for the learning pages. It includes language selection, section navigation controls, progress display, and is connected to the `learningStore`.
- **AIChatSidebar**: AI-powered chat interface with multiple provider support, chat history management, and context referencing.
- **ContentDisplay**: Main content display component that renders markdown and interactive code blocks.
- **InteractiveCodeBlock**: Code editor component with execution capabilities using Pyodide.
- **shadcn/ui**: All UI components follow shadcn/ui patterns with class-variance-authority.
- **Layout**: The learning page uses a three-column resizable layout with navigation sidebar, content area, and AI chat sidebar.
- **Responsive**: Uses Tailwind's responsive utilities (mobile-first) with a dedicated layout for smaller screens.

## Development Notes

- Server components are default (no "use client" directive).
- Form and state-driven components require client components for interactivity.
- CSS variables are configured for theming in `globals.css`.
- All components use TypeScript with proper type definitions.
- The learning platform uses a route group `(learn)` for organizing learning-related pages.
- AI chat functionality is implemented with multiple provider support.
- Code execution is handled through Pyodide service for in-browser execution.
