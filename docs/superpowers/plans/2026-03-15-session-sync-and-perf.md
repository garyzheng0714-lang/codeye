# Session Sync & Performance Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two issues: (1) left sidebar doesn't sync Claude CLI conversation history in real-time, and (2) the overall interaction feels laggy due to rendering performance problems.

**Architecture:** Add `fs.watch` file watcher in Electron main process to detect new/changed JSONL files under `~/.claude/projects/`, push changes to renderer via IPC events, and debounce to avoid thrashing. For performance, batch store updates during streaming, add `memo` to key components, optimize Zustand selector granularity, and add incremental turn grouping.

**Tech Stack:** Electron `fs.watch`, IPC events, React.memo, Zustand shallow selectors, `unstable_batchedUpdates` (from react-dom)

---

## Chunk 1: Real-time Session Sync via File Watcher

### Problem Analysis

Currently, CLI session history is only imported:
1. At app startup (`syncAllFoldersFromCli()` in `bootstrap.ts`)
2. When a folder is expanded for the first time (`handleActivateFolder` in `SessionList.tsx`)

There is **no file watching**. If you start a new Claude CLI conversation while Codeye is open, it won't appear in the sidebar until you restart the app.

### Task 1: Add `fs.watch` file watcher in Electron main process

**Files:**
- Create: `electron/ipc/historyWatcher.ts`
- Modify: `electron/main.ts` (register watcher)
- Modify: `electron/preload.ts` (expose new IPC event)

- [ ] **Step 1: Create the historyWatcher module**

```typescript
// electron/ipc/historyWatcher.ts
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { BrowserWindow } from 'electron';

const DEBOUNCE_MS = 2000;
const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

interface WatcherEntry {
  watcher: fs.FSWatcher;
  folderPath: string;
  encodedPath: string;
}

const watchers = new Map<string, WatcherEntry>();
let debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getMainWindow(): BrowserWindow | null {
  const { BrowserWindow } = require('electron');
  const windows = BrowserWindow.getAllWindows();
  return windows[0] ?? null;
}

function notifyRenderer(encodedPath: string) {
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return;
  win.webContents.send('projects:history-changed', encodedPath);
}

function debouncedNotify(encodedPath: string) {
  const existing = debounceTimers.get(encodedPath);
  if (existing) clearTimeout(existing);
  debounceTimers.set(
    encodedPath,
    setTimeout(() => {
      debounceTimers.delete(encodedPath);
      notifyRenderer(encodedPath);
    }, DEBOUNCE_MS)
  );
}

export function watchProjectHistory(folderPath: string, encodedPath: string): void {
  if (watchers.has(encodedPath)) return;

  const projectDir = path.join(PROJECTS_DIR, encodedPath);
  try {
    if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) return;
  } catch {
    return;
  }

  try {
    const watcher = fs.watch(projectDir, { persistent: false }, (eventType, filename) => {
      if (filename && filename.endsWith('.jsonl')) {
        debouncedNotify(encodedPath);
      }
    });

    watcher.on('error', () => {
      unwatchProjectHistory(encodedPath);
    });

    watchers.set(encodedPath, { watcher, folderPath, encodedPath });
  } catch {
    // directory may not be watchable
  }
}

export function unwatchProjectHistory(encodedPath: string): void {
  const entry = watchers.get(encodedPath);
  if (!entry) return;
  try { entry.watcher.close(); } catch { /* ignore */ }
  watchers.delete(encodedPath);
  const timer = debounceTimers.get(encodedPath);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(encodedPath);
  }
}

export function unwatchAll(): void {
  for (const [key] of watchers) {
    unwatchProjectHistory(key);
  }
}
```

- [ ] **Step 2: Run — verify TypeScript compiles**

Run: `cd /Users/simba/local_vibecoding/codeye && npx tsc --noEmit`
Expected: No errors related to `historyWatcher.ts`

- [ ] **Step 3: Register watcher IPC in projects.ts**

Add to the end of `registerProjectHandlers()` in `electron/ipc/projects.ts`:

```typescript
import { watchProjectHistory, unwatchProjectHistory } from './historyWatcher';

// Inside registerProjectHandlers, after existing handlers:
ipcMain.handle('projects:watch-history', (_, folderPath: string, encodedPath: string) => {
  if (typeof folderPath !== 'string' || typeof encodedPath !== 'string') return;
  watchProjectHistory(folderPath, encodedPath);
});

ipcMain.handle('projects:unwatch-history', (_, encodedPath: string) => {
  if (typeof encodedPath !== 'string') return;
  unwatchProjectHistory(encodedPath);
});
```

- [ ] **Step 4: Expose IPC events in preload.ts**

Add to the `projects` section of `electron/preload.ts`:

```typescript
watchHistory: (folderPath: string, encodedPath: string) =>
  ipcRenderer.invoke('projects:watch-history', folderPath, encodedPath),
unwatchHistory: (encodedPath: string) =>
  ipcRenderer.invoke('projects:unwatch-history', encodedPath),
onHistoryChanged: (callback: (encodedPath: string) => void) => {
  const handler = (_: unknown, encodedPath: string) => callback(encodedPath);
  ipcRenderer.on('projects:history-changed', handler);
  return () => ipcRenderer.removeListener('projects:history-changed', handler);
},
```

- [ ] **Step 5: Update electron.d.ts type declarations**

Add to the `projects` interface in `src/types/electron.d.ts`:

```typescript
watchHistory(folderPath: string, encodedPath: string): Promise<void>;
unwatchHistory(encodedPath: string): Promise<void>;
onHistoryChanged(callback: (encodedPath: string) => void): () => void;
```

- [ ] **Step 6: Commit**

```bash
git add electron/ipc/historyWatcher.ts electron/ipc/projects.ts electron/preload.ts src/types/electron.d.ts
git commit -m "feat: add fs.watch based CLI history file watcher"
```

---

### Task 2: Wire file watcher into bootstrap + auto-resync

**Files:**
- Modify: `src/storage/bootstrap.ts`
- Modify: `src/components/Layout/Sidebar.tsx`

- [ ] **Step 1: Add path encoding utility (client-side mirror)**

Add to `src/storage/bootstrap.ts`:

```typescript
function encodeProjectPath(folderPath: string): string {
  // Must mirror electron/ipc/projects.ts encodeClaudeProjectPath
  return folderPath.replace(/[^a-zA-Z0-9]/g, '-');
}
```

- [ ] **Step 2: Start watchers for all local folders on startup**

Modify `syncAllFoldersFromCli()` in `bootstrap.ts` — after the loop that calls `syncFolderFromCli`, add watcher registration:

```typescript
// After syncing, register file watchers for real-time updates
for (const folder of localFolders) {
  if (window.electronAPI?.projects.watchHistory && folder.path) {
    window.electronAPI.projects.watchHistory(folder.path, encodeProjectPath(folder.path));
  }
}
```

- [ ] **Step 3: Add `onHistoryChanged` listener in bootstrap**

Add a new exported function in `bootstrap.ts`:

```typescript
export function startHistoryChangeListener(): () => void {
  if (!window.electronAPI?.projects.onHistoryChanged) return () => {};

  const removeListener = window.electronAPI.projects.onHistoryChanged((encodedPath) => {
    const { folders } = useSessionStore.getState();
    const matchedFolder = folders.find(
      (f) => f.kind === 'local' && f.path && encodeProjectPath(f.path) === encodedPath
    );
    if (matchedFolder) {
      syncFolderFromCli(matchedFolder);
    }
  });

  return removeListener;
}
```

Also make `syncFolderFromCli` accept `{ id: string; path: string }` (already does).

- [ ] **Step 4: Call listener in App.tsx or wherever bootstrap is invoked**

Find where `startSessionAutoPersistence()` is called and add:

```typescript
const cleanupHistoryListener = startHistoryChangeListener();
// In cleanup:
cleanupHistoryListener();
```

- [ ] **Step 5: Register watcher when adding new folders**

In `Sidebar.tsx`, inside `handleAddFolder`, after `syncFolder(folder)`:

```typescript
if (window.electronAPI?.projects.watchHistory && folder.path) {
  window.electronAPI.projects.watchHistory(
    folder.path,
    folder.path.replace(/[^a-zA-Z0-9]/g, '-')
  );
}
```

- [ ] **Step 6: Verify end-to-end**

Manual test:
1. Open Codeye Electron app
2. In a terminal, run `claude` in the same project directory
3. Have a short conversation in Claude CLI
4. Check: The new session should appear in the left sidebar within ~2-3 seconds

- [ ] **Step 7: Commit**

```bash
git add src/storage/bootstrap.ts src/components/Layout/Sidebar.tsx
git commit -m "feat: real-time CLI session sync via file watcher"
```

---

## Chunk 2: Performance — Reduce Unnecessary Re-renders

### Problem Analysis

During streaming, every `appendAssistantContent` call creates a new `messages` array, which triggers:
1. `MessageList` re-render (subscribes to `s.messages`)
2. Full `groupMessagesIntoTurns()` recomputation — O(n) over ALL messages
3. `SessionList` also re-renders if subscribed to chatStore

Additionally, `SessionList` uses destructured store access (`useSessionStore()` without selector), which means ANY sessionStore change triggers a re-render.

### Task 3: Fix SessionList store subscription granularity

**Files:**
- Modify: `src/components/Session/SessionList.tsx`

- [ ] **Step 1: Replace destructured store access with individual selectors**

Replace the current destructured pattern at the top of `SessionList`:

```typescript
// BEFORE (line 77-88):
const {
  folders, sessions, activeFolderId, activeSessionId,
  setActiveFolder, setActiveSession, deleteSession,
  renameSession, saveSessionMessages, getFolder,
} = useSessionStore();

// AFTER — individual selectors:
const folders = useSessionStore((s) => s.folders);
const sessions = useSessionStore((s) => s.sessions);
const activeFolderId = useSessionStore((s) => s.activeFolderId);
const activeSessionId = useSessionStore((s) => s.activeSessionId);
const setActiveFolder = useSessionStore((s) => s.setActiveFolder);
const setActiveSession = useSessionStore((s) => s.setActiveSession);
const deleteSession = useSessionStore((s) => s.deleteSession);
const renameSession = useSessionStore((s) => s.renameSession);
const saveSessionMessages = useSessionStore((s) => s.saveSessionMessages);
const getFolder = useSessionStore((s) => s.getFolder);
```

Note: Zustand function references are stable (same reference across renders), so selecting them individually avoids creating new objects.

- [ ] **Step 2: Wrap SessionList in React.memo**

```typescript
import { memo } from 'react';
// ...
export default memo(function SessionList({ ... }) {
  // ... existing implementation
});
```

- [ ] **Step 3: Verify — run TypeScript check**

Run: `cd /Users/simba/local_vibecoding/codeye && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/Session/SessionList.tsx
git commit -m "perf: optimize SessionList store subscriptions and add memo"
```

---

### Task 4: Memo ChatPanel and Sidebar

**Files:**
- Modify: `src/components/Chat/ChatPanel.tsx`
- Modify: `src/components/Layout/Sidebar.tsx`

- [ ] **Step 1: Wrap ChatPanel in memo**

```typescript
import { memo } from 'react';

export default memo(function ChatPanel() {
  // ... existing
});
```

- [ ] **Step 2: Wrap Sidebar in memo**

```typescript
import { memo } from 'react';
// Already uses useCallback — add memo:
export default memo(function Sidebar() {
  // ... existing
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Chat/ChatPanel.tsx src/components/Layout/Sidebar.tsx
git commit -m "perf: memo ChatPanel and Sidebar"
```

---

### Task 5: Batch streaming store updates

**Files:**
- Modify: `src/hooks/useClaudeChat.ts`

- [ ] **Step 1: Import `unstable_batchedUpdates` from react-dom**

At the top of `useClaudeChat.ts`:

```typescript
import { unstable_batchedUpdates } from 'react-dom';
```

- [ ] **Step 2: Batch tool_use handling with text flush**

In the Electron message handler (line ~60-68), wrap tool-related operations:

```typescript
// BEFORE:
textBatcher.flush();
actions.addToolCall({ id: toolId, name: block.name, input: toolInput, expanded: false });

// AFTER:
unstable_batchedUpdates(() => {
  textBatcher.flush();
  actions.addToolCall({ id: toolId, name: block.name, input: toolInput, expanded: false });
});
```

Apply the same pattern in the WebSocket handler section (~line 117-123).

- [ ] **Step 3: Batch cost updates with content**

Wrap the cost update + text batching in the same batch call. In both Electron and WS handlers:

```typescript
// BEFORE:
if (costUsd !== undefined) {
  actions.updateCost(costUsd || 0, inputToks || 0, outputToks || 0);
}

// AFTER:
if (costUsd !== undefined) {
  unstable_batchedUpdates(() => {
    actions.updateCost(costUsd || 0, inputToks || 0, outputToks || 0);
  });
}
```

- [ ] **Step 4: Batch tool_progress updates**

```typescript
// BEFORE (line ~207):
useChatStore.getState().updateToolProgress(p.toolId, p.lines);

// AFTER:
unstable_batchedUpdates(() => {
  useChatStore.getState().updateToolProgress(p.toolId, p.lines);
});
```

- [ ] **Step 5: Verify — run TypeScript check**

Run: `cd /Users/simba/local_vibecoding/codeye && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useClaudeChat.ts
git commit -m "perf: batch streaming store updates to reduce re-renders"
```

---

### Task 6: Incremental turn grouping

**Files:**
- Modify: `src/utils/turnGrouping.ts`
- Modify: `src/components/Chat/MessageList.tsx`

- [ ] **Step 1: Add incremental turn update to turnGrouping.ts**

```typescript
/**
 * Incrementally update turns when only the last message changed (streaming append).
 * Returns null if a full regroup is needed.
 */
export function updateLastTurn(
  prevTurns: Turn[],
  messages: DisplayMessage[]
): Turn[] | null {
  if (messages.length === 0) return [];
  if (prevTurns.length === 0) return null; // need full grouping

  const lastMsg = messages[messages.length - 1];

  // During streaming, usually only the last assistant message changes
  if (lastMsg.role === 'assistant') {
    const lastTurn = prevTurns[prevTurns.length - 1];
    const lastTurnAssistantIds = lastTurn.assistantMessages.map((m) => m.id);

    if (lastTurnAssistantIds.includes(lastMsg.id)) {
      // Update existing assistant message in last turn
      const updatedAssistant = lastTurn.assistantMessages.map((m) =>
        m.id === lastMsg.id ? lastMsg : m
      );
      const updatedTurn = { ...lastTurn, assistantMessages: updatedAssistant };
      return [...prevTurns.slice(0, -1), updatedTurn];
    }

    // New assistant message added to current turn
    if (lastTurn.userMessage) {
      const updatedTurn = {
        ...lastTurn,
        assistantMessages: [...lastTurn.assistantMessages, lastMsg],
      };
      return [...prevTurns.slice(0, -1), updatedTurn];
    }
  }

  // New user message = new turn — or complex case, fall back to full
  return null;
}
```

- [ ] **Step 2: Use incremental grouping in MessageList**

```typescript
// In MessageList, replace the simple useMemo:
const prevTurnsRef = useRef<Turn[]>([]);
const prevMsgLenRef = useRef(0);

const turns = useMemo(() => {
  // If only appending to the last message (streaming), try incremental
  if (
    messages.length >= prevMsgLenRef.current &&
    prevTurnsRef.current.length > 0
  ) {
    const incremental = updateLastTurn(prevTurnsRef.current, messages);
    if (incremental) {
      prevTurnsRef.current = incremental;
      prevMsgLenRef.current = messages.length;
      return incremental;
    }
  }

  // Full regroup
  const full = groupMessagesIntoTurns(messages);
  prevTurnsRef.current = full;
  prevMsgLenRef.current = messages.length;
  return full;
}, [messages]);
```

Add imports: `useRef` from react, `updateLastTurn` from turnGrouping.

- [ ] **Step 3: Verify — run TypeScript check**

Run: `cd /Users/simba/local_vibecoding/codeye && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/utils/turnGrouping.ts src/components/Chat/MessageList.tsx
git commit -m "perf: incremental turn grouping for O(1) streaming updates"
```

---

## Chunk 3: Performance — Reduce Persistence Thrashing During Streaming

### Task 7: Skip session persistence during streaming

**Files:**
- Modify: `src/storage/bootstrap.ts`

- [ ] **Step 1: The fix is already partially there but incomplete**

In `startSessionAutoPersistence()`, the chatStore subscriber already has:

```typescript
if (state.isStreaming) return; // line 133
```

This prevents chat→session sync during streaming. But the **sessionStore subscriber** (line 116) fires on every state change, including when `importClaudeSessions` runs. This is fine — it's not the hot path.

The real issue: After streaming finishes, `finishStreaming()` triggers one large sync. Verify this works correctly by checking:

```typescript
// In the chat subscriber, streaming finish triggers:
// state.isStreaming (false) !== prev.isStreaming (true), AND
// state.messages !== prev.messages → sync fires once
```

This is correct behavior. No changes needed here.

- [ ] **Step 2: Increase chat sync debounce during heavy use**

Optional optimization: increase `CHAT_SYNC_DEBOUNCE_MS` from 500 to 1000ms to reduce persistence frequency after rapid session switches:

```typescript
const CHAT_SYNC_DEBOUNCE_MS = 1000;
```

- [ ] **Step 3: Commit**

```bash
git add src/storage/bootstrap.ts
git commit -m "perf: increase chat sync debounce to reduce persistence thrashing"
```

---

### Task 8: Memoize InputArea

**Files:**
- Modify: `src/components/Chat/InputArea.tsx`

- [ ] **Step 1: Read InputArea.tsx**

Read the file to check current memo status and store subscriptions.

- [ ] **Step 2: Wrap in memo if not already**

```typescript
import { memo } from 'react';
export default memo(function InputArea() {
  // ...
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Chat/InputArea.tsx
git commit -m "perf: memo InputArea component"
```

---

## Summary of Changes

### Session Sync (Chunk 1)
| File | Change |
|------|--------|
| `electron/ipc/historyWatcher.ts` | NEW — fs.watch on ~/.claude/projects/<encoded>/ |
| `electron/ipc/projects.ts` | Add watch/unwatch IPC handlers |
| `electron/preload.ts` | Expose watchHistory/unwatchHistory/onHistoryChanged |
| `src/types/electron.d.ts` | Type declarations for new IPC |
| `src/storage/bootstrap.ts` | Start watchers + listen for change events |
| `src/components/Layout/Sidebar.tsx` | Register watcher on new folder add |

### Performance (Chunks 2-3)
| File | Change |
|------|--------|
| `src/components/Session/SessionList.tsx` | Individual selectors + memo |
| `src/components/Chat/ChatPanel.tsx` | memo |
| `src/components/Layout/Sidebar.tsx` | memo |
| `src/components/Chat/InputArea.tsx` | memo |
| `src/hooks/useClaudeChat.ts` | unstable_batchedUpdates for store writes |
| `src/utils/turnGrouping.ts` | Add `updateLastTurn()` for incremental grouping |
| `src/components/Chat/MessageList.tsx` | Use incremental grouping during streaming |
| `src/storage/bootstrap.ts` | Increase chat sync debounce |

### Expected Impact
- **Session sync**: New CLI conversations appear within ~2-3s (debounce)
- **Streaming FPS**: Fewer re-renders per frame — tool calls and text no longer trigger separate render cycles
- **SessionList**: No longer re-renders on every chatStore change
- **Turn grouping**: O(1) during streaming instead of O(n)
