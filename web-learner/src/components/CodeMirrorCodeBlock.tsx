'use client';

import React, { memo, useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView, highlightActiveLine, highlightActiveLineGutter, Decoration } from '@codemirror/view';
import { Compartment, RangeSet, StateEffect, StateField } from '@codemirror/state';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';

// Define effects for search highlighting
const addSearchHighlight = StateEffect.define<RangeSet<Decoration>>();
const clearSearchHighlight = StateEffect.define();

// Create decorations for search highlighting
const searchMatchDecoration = Decoration.mark({
  class: 'cm-searchMatch',
  attributes: { style: 'background-color: var(--accent); color: var(--accent-foreground); border-radius: 2px;' }
});

// Create search highlighting field
const searchHighlightField = StateField.define<RangeSet<Decoration>>({
  create() {
    return Decoration.none;
  },
  update(value, transaction) {
    value = value.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(addSearchHighlight)) {
        value = effect.value;
      } else if (effect.is(clearSearchHighlight)) {
        value = Decoration.none;
      }
    }
    return value;
  },
  provide: f => EditorView.decorations.from(f)
});

// Create a theme override extension (without active line styling)
const themeOverride = EditorView.theme({
  '&': {
    backgroundColor: 'var(--background) !important',
    color: 'var(--foreground)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--background) !important',
    borderRight: '1px solid var(--border)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-foreground)',
    borderRadius: '2px',
    padding: '1px 2px',
  },
});

// Create dynamic styling for active line that respects highlight state
const createDynamicHighlightTheme = (highlightEnabled: boolean) => EditorView.theme({
  '.cm-activeLine': highlightEnabled ? {
    backgroundColor: 'var(--accent)',
  } : {},
  '.cm-activeLineGutter': highlightEnabled ? {
    backgroundColor: 'var(--muted)',
  } : {},
});

interface CodeMirrorCodeBlockProps {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  language: 'javascript' | 'python';
  readOnly?: boolean;
  className?: string;
  searchTerm?: string;
  enableSearch?: boolean;
  fontSize?: number;
}

export const CodeMirrorCodeBlock = memo(function CodeMirrorCodeBlock({
  value,
  onChange,
  onBlur,
  language,
  readOnly = false,
  className = '',
  searchTerm = '',
  enableSearch = false,
  fontSize = 14,
}: CodeMirrorCodeBlockProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [highlightCompartment] = useState(new Compartment());
  const [themeCompartment] = useState(new Compartment());
  const highlightIsOn = useRef(true);
  const viewRef = useRef<EditorView | null>(null);

  // Function to find and highlight search matches
  const highlightSearchMatches = (view: EditorView, searchTerm: string) => {
    if (!searchTerm.trim()) {
      view.dispatch({ effects: clearSearchHighlight.of(null) });
      return;
    }

    const doc = view.state.doc;
    const ranges = [];
    const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      let match;
      while ((match = searchRegex.exec(line.text)) !== null) {
        const from = line.from + match.index;
        const to = from + match[0].length;
        ranges.push(searchMatchDecoration.range(from, to));
      }
    }

    view.dispatch({
      effects: addSearchHighlight.of(RangeSet.of(ranges, true))
    });
  };

  const dynamicHighlightExtension = EditorView.updateListener.of((update) => {
    if (update.selectionSet) {
      const isSelectionEmpty = update.state.selection.main.empty;
      const hasSearchMatches = searchTerm && searchTerm.trim().length > 0;

      // Only disable line highlighting when there's actual text selection AND no search matches
      if (!isSelectionEmpty && highlightIsOn.current && !hasSearchMatches) {
        highlightIsOn.current = false;
        update.view.dispatch({
          effects: [
            highlightCompartment.reconfigure([]),
            themeCompartment.reconfigure(createDynamicHighlightTheme(false))
          ]
        });
      } else if ((isSelectionEmpty || hasSearchMatches) && !highlightIsOn.current) {
        // Re-enable line highlighting when:
        // 1. Selection is empty (cursor only), OR
        // 2. There are search matches active
        highlightIsOn.current = true;
        update.view.dispatch({
          effects: [
            highlightCompartment.reconfigure([highlightActiveLine(), highlightActiveLineGutter()]),
            themeCompartment.reconfigure(createDynamicHighlightTheme(true))
          ]
        });
      }
    }
  });

  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setTheme(isDarkMode ? 'dark' : 'light');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Effect to handle search highlighting changes
  useEffect(() => {
    if (viewRef.current && enableSearch) {
      highlightSearchMatches(viewRef.current, searchTerm);
    }
  }, [searchTerm, enableSearch]);

  // Effect to handle value changes and re-apply search highlighting
  useEffect(() => {
    if (viewRef.current && enableSearch && searchTerm) {
      setTimeout(() => {
        highlightSearchMatches(viewRef.current!, searchTerm);
      }, 50);
    }
  }, [value, enableSearch, searchTerm]);

  const languageExtension = language === 'javascript' 
    ? javascript({ jsx: true, typescript: true })
    : python();

  return (
    <div 
      className={`border rounded-md overflow-hidden bg-background ${className}`}
    >
      <CodeMirror
        value={value + '\n'}
        maxHeight="200px"
        extensions={[
          theme === 'light' ? githubLight : githubDark,
          themeOverride,
          EditorView.theme({
            '&': { fontSize: `${fontSize}px` },
            '.cm-content': { fontSize: `${fontSize}px` },
            '.cm-gutters': { fontSize: `${fontSize}px` },
          }),
          languageExtension,
          EditorView.lineWrapping,
          searchHighlightField,
          highlightCompartment.of([highlightActiveLine(), highlightActiveLineGutter()]),
          themeCompartment.of(createDynamicHighlightTheme(true)),
          dynamicHighlightExtension,
        ]}
        onChange={onChange}
        onBlur={onBlur ? (event) => onBlur(event.target.innerText) : undefined}
        readOnly={readOnly}
        onCreateEditor={(view) => {
          viewRef.current = view;
          if (enableSearch && searchTerm) {
            setTimeout(() => {
              highlightSearchMatches(view, searchTerm);
            }, 100);
          }
        }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightSelectionMatches: true,
          searchKeymap: false,
        }}
        style={{
          fontSize: '14px',
        }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.value === nextProps.value &&
    prevProps.language === nextProps.language &&
    prevProps.readOnly === nextProps.readOnly &&
    prevProps.className === nextProps.className &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.onBlur === nextProps.onBlur &&
    prevProps.searchTerm === nextProps.searchTerm &&
    prevProps.enableSearch === nextProps.enableSearch
  );
});