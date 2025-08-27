# Storage Feature Testing Guide

## Test Setup
1. Open VS Code with the Learn Linker extension
2. Make sure AI is configured (DeepSeek or other provider)

## Test Cases

### 1. Save Code from Explanation
1. Select some code in any file
2. Right-click → "Learn Linker: Explain Selection"
3. Wait for explanation to appear
4. Click "Save for Review" button in the explanation panel
5. Verify: Should see "Code snippet saved for review!" message
6. Optional: Choose "Add Note" to add personal notes

### 2. Save Code Manually
1. Select some code
2. Right-click → "Learn Linker: Save to Review"
3. Enter optional explanation and notes
4. Verify: Snippet saved successfully

### 3. View Snippet Collection
1. Command Palette (Cmd+Shift+P)
2. Run "Learn Linker: Show Snippet Collection"
3. Verify: Should display all saved snippets in a webview

### 4. Review Queue
1. Command Palette → "Learn Linker: Show Review Queue"
2. Should show snippets due for review
3. Mark snippets as reviewed with quality ratings

### 5. Export Snippets
1. Command Palette → "Learn Linker: Export Snippets"
2. Choose format (JSON, Markdown, or HTML)
3. Select save location
4. Verify: File created with snippets

### 6. Import Snippets
1. Command Palette → "Learn Linker: Import Snippets"
2. Select a previously exported JSON file
3. Verify: Snippets imported successfully

### 7. Learning Statistics
1. Command Palette → "Learn Linker: Show Learning Statistics"
2. Should display:
   - Total snippets
   - Mastered snippets
   - Pending/overdue reviews
   - Language breakdown
   - Difficulty distribution

## Expected Storage Locations
- **Workspace storage**: `.vscode/learn-linker/` (if using workspace storage)
- **Global storage**: VS Code's global storage directory

## Debugging
- Check Developer Tools console for errors (Help → Toggle Developer Tools)
- Check extension output channel: Output panel → "Learn Linker"