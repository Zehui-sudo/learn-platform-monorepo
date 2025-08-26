# Cherry Studio Markdown Integration Plan

## Overview
Your current project has a basic markdown renderer (`MarkdownRenderer.tsx`) that handles simple markdown elements. Cherry Studio implements a sophisticated, production-ready markdown system with advanced features like syntax highlighting, LaTeX math, interactive code execution, and specialized diagram rendering.

## Key Components to Extract from Cherry Studio

### 1. Core Markdown Rendering System
- **markdown.scss**: Complete styling system (~370 lines) with CSS variables
- **MarkdownShadowDOMRenderer.tsx**: Isolated rendering component for style conflicts
- **markdown.ts**: Processing utilities for LaTeX, code validation, etc.

### 2. Advanced Code Block System
- **CodeBlockView/view.tsx**: Main code block renderer with multiple view modes
- **CodePreview.tsx**: Shiki-based syntax highlighting
- **CodeToolbar/**: Interactive toolbar with copy, run, edit features
- **Special renderers**: Mermaid, PlantUML, SVG, Graphviz, HTML artifacts

### 3. Dependencies Required
```bash
# Core markdown
npm install react-markdown remark-gfm remark-math rehype-katex rehype-highlight
# Syntax highlighting
npm install shiki
# Math rendering
npm install katex
# Diagram rendering
npm install mermaid @mermaid/mermaid
# Code execution
npm install @pyodide/pyodide
```

## Integration Strategy

### Phase 1: CSS Styling Migration
1. **Extract Cherry Studio CSS variables** to your Tailwind config
2. **Convert markdown.scss** to Tailwind-compatible CSS
3. **Map color variables** to your existing design system

### Phase 2: Basic Markdown Renderer Replacement
1. **Replace current MarkdownRenderer.tsx** with enhanced version
2. **Add proper markdown parsing** using react-markdown
3. **Integrate syntax highlighting** with shiki

### Phase 3: Advanced Features
1. **Code block enhancements** with interactive features
2. **Math rendering** with KaTeX
3. **Diagram support** (Mermaid, PlantUML)
4. **Special content types** (HTML artifacts, SVG)

### Phase 4: Optimization
1. **Shadow DOM isolation** (optional for style conflicts)
2. **Performance optimizations** (lazy loading, virtual scrolling)
3. **Responsive design** refinements

## File Structure Changes

### New Components
```
src/components/markdown/
├── EnhancedMarkdownRenderer.tsx    # Main renderer
├── CodeBlock/
│   ├── CodeBlock.tsx              # Interactive code blocks
│   ├── CodePreview.tsx            # Syntax highlighting
│   └── CodeToolbar.tsx            # Interactive tools
├── SpecialRenderers/
│   ├── MermaidRenderer.tsx        # Mermaid diagrams
│   ├── PlantUMLRenderer.tsx       # PlantUML diagrams
│   └── HtmlArtifactRenderer.tsx   # HTML content
└── styles/
    ├── markdown.css               # Cherry Studio styles adapted
    └── variables.css              # CSS variables
```

### Modified Files
- `src/components/MarkdownRenderer.tsx` → Replace entirely
- `src/components/ContentDisplay.tsx` → Update to use new renderer
- `tailwind.config.ts` → Add CSS variables mapping
- `src/app/globals.css` → Import new markdown styles

## CSS Styling Adaptation Strategy

### Color System Mapping
Yes, I will adapt Cherry Studio's CSS to match your current project's design system. Here's the mapping strategy:

#### Cherry Studio Variables → Your Tailwind Theme
```css
/* Original Cherry Studio variables */
:root {
  --color-text: #1a1a1a;
  --color-background: #ffffff;
  --color-border: #e5e5e5;
  --color-primary: #0066cc;
  --color-background-mute: #f5f5f5;
  --color-background-soft: #fafafa;
  --color-link: #0066cc;
  --color-text-light: #666666;
  --color-text-3: #999999;
  --color-reference: #0066cc;
  --color-reference-text: #ffffff;
  --color-reference-background: #f0f8ff;
}

/* Adapted to your shadcn/ui theme */
:root {
  --color-text: theme('colors.foreground');
  --color-background: theme('colors.background');
  --color-border: theme('colors.border');
  --color-primary: theme('colors.primary');
  --color-background-mute: theme('colors.muted');
  --color-background-soft: theme('colors.accent');
  --color-link: theme('colors.primary');
  --color-text-light: theme('colors.muted-foreground');
  --color-text-3: theme('colors.muted-foreground');
  --color-reference: theme('colors.primary');
  --color-reference-text: theme('colors.primary-foreground');
  --color-reference-background: theme('colors.secondary');
}

/* Dark mode adaptation */
.dark {
  --color-text: theme('colors.foreground');
  --color-background: theme('colors.background');
  --color-border: theme('colors.border');
  --color-primary: theme('colors.primary');
  --color-background-mute: theme('colors.muted');
  --color-background-soft: theme('colors.accent');
}
```

### Typography Adaptation
```css
/* Cherry Studio typography → Tailwind typography */
.markdown {
  /* Headings */
  h1 { @apply text-2xl font-bold mt-6 mb-4 border-b border-border pb-2; }
  h2 { @apply text-xl font-semibold mt-6 mb-3 border-b border-border pb-2; }
  h3 { @apply text-lg font-semibold mt-4 mb-2; }
  h4 { @apply text-base font-semibold mt-4 mb-2; }
  h5 { @apply text-sm font-semibold mt-3 mb-1; }
  h6 { @apply text-xs font-semibold mt-3 mb-1; }

  /* Paragraphs */
  p { @apply my-4 text-sm leading-relaxed; }

  /* Code */
  code { @apply bg-muted text-xs px-1 py-0.5 rounded; }
  pre { @apply bg-muted p-4 rounded-lg overflow-x-auto; }
  pre code { @apply bg-transparent p-0 text-sm; }

  /* Lists */
  ul { @apply list-disc ml-6 my-4; }
  ol { @apply list-decimal ml-6 my-4; }
  li { @apply mb-2 text-sm; }

  /* Blockquotes */
  blockquote { @apply border-l-4 border-primary bg-muted p-4 italic rounded-r-lg; }

  /* Tables */
  table { @apply w-full my-4 border-collapse border border-border rounded-lg; }
  th { @apply bg-muted p-2 text-left font-semibold border-b border-border; }
  td { @apply p-2 border-b border-border; }
  tr:hover { @apply bg-muted/50; }

  /* Links */
  a { @apply text-primary hover:underline; }
}
```

### Component-Specific Styling Adaptations

#### Code Blocks
```css
/* Adapt Cherry Studio's sophisticated code blocks */
.code-block {
  @apply relative bg-muted rounded-lg overflow-hidden;
  
  .code-header {
    @apply flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border;
  }
  
  .code-language {
    @apply text-xs font-medium text-muted-foreground;
  }
  
  .code-actions {
    @apply flex items-center gap-2;
  }
  
  .code-content {
    @apply p-4 overflow-x-auto;
  }
}
```

#### Interactive Elements
```css
/* Adapt interactive features */
.copy-button {
  @apply p-1.5 rounded hover:bg-accent transition-colors;
}

.run-button {
  @apply flex items-center gap-2 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90;
}

.view-mode-toggle {
  @apply flex items-center gap-1 p-1 rounded bg-muted;
}

.view-mode-button {
  @apply px-2 py-1 text-xs rounded hover:bg-accent data-[active]:bg-primary data-[active]:text-primary-foreground;
}
```

## Implementation Details

### CSS Variables Mapping
```css
:root {
  --color-text: theme('colors.foreground');
  --color-background: theme('colors.background');
  --color-border: theme('colors.border');
  --color-primary: theme('colors.primary');
  --color-background-mute: theme('colors.muted');
  --color-background-soft: theme('colors.accent');
  --color-link: theme('colors.primary');
  --color-text-light: theme('colors.muted-foreground');
  --color-text-3: theme('colors.muted-foreground');
  --color-reference: theme('colors.primary');
  --color-reference-text: theme('colors.primary-foreground');
  --color-reference-background: theme('colors.secondary');
}
```

### Key Features to Implement
1. **GitHub Flavored Markdown** with tables, task lists
2. **Syntax highlighting** with 100+ languages
3. **LaTeX math** inline and block equations
4. **Interactive code** execution (Python via Pyodide)
5. **Diagram rendering** (Mermaid, PlantUML, Graphviz)
6. **Copy/download** functionality
7. **Responsive tables** and images
8. **Footnotes** and references

### Performance Considerations
- **Lazy loading** for heavy renderers (Mermaid, Pyodide)
- **Virtual scrolling** for large documents
- **Debounced updates** for smooth editing
- **SSR compatibility** for Next.js

## Risk Mitigation
1. **Style isolation** using CSS modules or Shadow DOM
2. **Progressive enhancement** - basic rendering first
3. **Error boundaries** around special renderers
4. **Fallback handling** for unsupported features

## Testing Strategy
1. **Unit tests** for markdown processing
2. **Visual regression** tests for styling
3. **Integration tests** for interactive features
4. **Performance testing** for large documents

This plan provides a systematic approach to integrate Cherry Studio's sophisticated markdown rendering while maintaining compatibility with your Next.js architecture and Tailwind CSS styling system. The styling will be fully adapted to match your current design system, ensuring visual consistency across the application.