# Codeye Comprehensive UI Audit & Fix Plan (Rev 3)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all recurring UI bugs found through full codebase audit -- session swallowing, dropdown clipping, scroll hijacking, stale state, and positioning issues -- with architectural changes that prevent recurrence.

**Architecture:** The fixes target 6 root cause categories. Each is a structural fix (not a patch) that eliminates the class of bug, not just the symptom. Changes are scoped to existing files with minimal new abstractions.

**Tech Stack:** React 18, Zustand, CSS (no Tailwind utility classes), Electron IPC, TypeScript

---

## Root Cause Analysis

After auditing all 90+ source files, I identified **6 structural root causes** that produce the recurring bugs:

| # | Root Cause | Symptoms | Why patches keep failing |
|---|-----------|----------|--------------------------|
| RC-1 | CLI sync overwrites active session data | "Session swallowed" -- messages disappear after sync | Patches fix one code path but the overwrite happens in `importClaudeSessions` which runs asynchronously from file watcher |
| RC-2 | Dropdowns inside nested `overflow: hidden` | Model selector / Permission dropdown clipped by sidebar | Patches adjust z-index but the real issue is CSS overflow containment across 3 nested parents (`.app-main`, `.primary-pane`, `.chat-panel`) |
| RC-3 | Auto-scroll ignores user scroll position | User reading old messages gets yanked to bottom | Patches add flags but the `useEffect` dependency on `messages` triggers on every content append |
| RC-4 | `getActions()` captures stale message state + streaming guard drops late content | Incomplete messages, missed tool calls | Stale closure in `getLastAssistantContent`; `isStreaming` guard rejects content arriving after `finishStreaming()` |
| RC-5 | localStorage size limit causes silent persistence failure | Sessions "vanish" on reload | Full tool call outputs stored in single localStorage key can exceed ~5MB limit |
| RC-6 | `contain: layout paint` on `.sidebar-content` overrides positioning context | FolderContextMenu may render offset from header | `.project-header` has `position: relative` but `contain: layout paint` on ancestor creates a new containing block |

---

## Chunk 1: Session Data Integrity (RC-1, RC-5)

### Task 1: Protect active session from CLI sync overwrite

**Files:**
- Modify: `src/stores/sessionStore.ts` (`importClaudeSessions` method)
- Test: `src/stores/sessionStore.test.ts`

The core bug: `importClaudeSessions` finds sessions by `claudeSessionId` and **replaces their messages** with imported data. If the user is actively chatting in a session that has a `claudeSessionId`, the import overwrites their live messages.

- [ ] **Step 1: Write failing test for active session protection**

Add to `src/stores/sessionStore.test.ts`:

```typescript
it('importClaudeSessions should not overwrite the active session messages', () => {
  const store = useSessionStore.getState();
  const folder = store.createFolder('/test', 'Test');
  const session = store.createSession('Active', folder.id);

  // Simulate chatStore linking a claudeSessionId
  useSessionStore.getState().saveSessionMessages(
    session.id,
    [{ id: '1', role: 'user', content: 'Hello', toolCalls: [], timestamp: Date.now() }],
    0, 0, 0,
    { claudeSessionId: 'claude-abc-123' }
  );

  // Set this session as active
  store.setActiveSession(session.id);

  // CLI sync tries to import with same claudeSessionId but empty messages
  const result = store.importClaudeSessions(folder.id, [{
    claudeSessionId: 'claude-abc-123',
    name: 'Imported',
    cwd: '/test',
    messages: [],
    inputTokens: 0,
    outputTokens: 0,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now(),
  }]);

  // Active session messages must NOT be overwritten
  const activeSession = store.getSession(session.id);
  expect(activeSession?.messages.length).toBe(1);
  expect(activeSession?.messages[0].content).toBe('Hello');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/sessionStore.test.ts --reporter=verbose`
Expected: FAIL -- active session gets overwritten

- [ ] **Step 3: Fix `importClaudeSessions` to skip active session message overwrite**

In `src/stores/sessionStore.ts`, inside `importClaudeSessions`'s `set()` callback, add active session guard right after the `const sessions = [...state.sessions];` line:

```typescript
set((state) => {
  const sessions = [...state.sessions];
  const activeId = state.activeSessionId;

  for (const imported of importedSessions) {
    const existingIndex = sessions.findIndex(
      (session) =>
        session.folderId === folderId &&
        session.claudeSessionId === imported.claudeSessionId
    );

    // CRITICAL: Never overwrite the currently active session's messages
    if (existingIndex >= 0 && sessions[existingIndex].id === activeId) {
      // Update metadata only (tokens, timestamps) but NOT messages
      const existing = sessions[existingIndex];
      sessions[existingIndex] = {
        ...existing,
        inputTokens: Math.max(existing.inputTokens, imported.inputTokens),
        outputTokens: Math.max(existing.outputTokens, imported.outputTokens),
        updatedAt: Math.max(existing.updatedAt, imported.updatedAt),
      };
      if (imported.updatedAt > latestUpdatedAt) {
        latestUpdatedAt = imported.updatedAt;
        latestSessionId = existing.id;
      }
      continue; // skip message overwrite
    }

    // --- rest of existing import logic (displayName, nextSession, etc.) unchanged ---
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/sessionStore.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/sessionStore.ts src/stores/sessionStore.test.ts
git commit -m "fix: protect active session from CLI sync overwrite (RC-1)"
```

### Task 2: Add localStorage size guard to prevent silent persistence failure

**Files:**
- Modify: `src/storage/sessionPersistence.ts` (`persistSessionSnapshot` function)
- Test: `src/storage/sessionPersistence.test.ts`

The bug: `persistSessionSnapshot` serializes ALL sessions with ALL messages including full tool call outputs. This can exceed localStorage's ~5MB limit. When `setItem` throws, persistence fails silently and sessions are lost on reload.

- [ ] **Step 1: Write failing test for size-guarded persistence**

Add to `src/storage/sessionPersistence.test.ts`:

```typescript
it('should trim tool call outputs when payload exceeds size limit', () => {
  const bigOutput = 'x'.repeat(100_000);
  const messages: DisplayMessage[] = Array.from({ length: 20 }, (_, i) => ({
    id: `msg-${i}`,
    role: 'assistant' as const,
    content: 'Response',
    toolCalls: Array.from({ length: 5 }, (_, j) => ({
      id: `tool-${i}-${j}`,
      name: 'Bash',
      input: { command: 'ls' },
      output: bigOutput,
      expanded: false,
    })),
    timestamp: Date.now(),
  }));

  const snapshot: SessionStoreSnapshot = {
    folders: [{ id: 'f1', name: 'Test', path: '/test', kind: 'local', hasSyncedClaudeHistory: false, createdAt: Date.now(), updatedAt: Date.now() }],
    sessions: [{
      id: 's1', folderId: 'f1', source: 'local', name: 'Big',
      cwd: '/test', messages, cost: 0, inputTokens: 0, outputTokens: 0,
      createdAt: Date.now(), updatedAt: Date.now(),
    }],
    activeFolderId: 'f1',
    activeSessionId: 's1',
  };

  expect(() => persistSessionSnapshot(snapshot, mockAdapter)).not.toThrow();
  const stored = mockAdapter.getItem('codeye.session-store');
  expect(stored).not.toBeNull();
  expect(stored!.length).toBeLessThan(4 * 1024 * 1024);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/storage/sessionPersistence.test.ts --reporter=verbose`
Expected: FAIL

- [ ] **Step 3: Implement progressive degradation persistence**

The persistence uses a **multi-level degradation loop**: if the serialized payload exceeds the 4MB budget, it progressively strips data until it fits. Backup write is also wrapped in try/catch (it can throw QuotaExceeded too).

In `src/storage/sessionPersistence.ts`, add helpers and rewrite `persistSessionSnapshot`:

```typescript
const MAX_PERSIST_SIZE = 4 * 1024 * 1024; // 4MB safety margin under ~5MB limit
const MAX_TOOL_OUTPUT_LENGTH = 500;
const TRIMMED_MARKER = '\n... [trimmed for storage]';

// --- Degradation Level 1: Truncate long tool outputs ---
function trimToolOutputs(sessions: SessionData[]): SessionData[] {
  return sessions.map((session) => ({
    ...session,
    messages: session.messages.map((msg) => ({
      ...msg,
      toolCalls: msg.toolCalls.map((tc) => {
        const { progressLines: _, ...rest } = tc; // never persist progressLines
        return {
          ...rest,
          output: rest.output && rest.output.length > MAX_TOOL_OUTPUT_LENGTH
            ? rest.output.slice(0, MAX_TOOL_OUTPUT_LENGTH) + TRIMMED_MARKER
            : rest.output,
        };
      }),
    })),
  }));
}

// --- Degradation Level 2: Strip ALL tool outputs from non-active sessions ---
function stripNonActiveToolOutputs(
  sessions: SessionData[],
  activeSessionId: string | null
): SessionData[] {
  return sessions.map((s) =>
    s.id === activeSessionId
      ? s
      : {
          ...s,
          messages: s.messages.map((m) => ({
            ...m,
            toolCalls: m.toolCalls.map(({ progressLines: _, output: __, ...rest }) => rest),
          })),
        }
  );
}

// --- Degradation Level 3: Drop messages from oldest non-active sessions ---
function dropOldestSessionMessages(
  sessions: SessionData[],
  activeSessionId: string | null
): SessionData[] {
  const sorted = [...sessions].sort((a, b) => a.updatedAt - b.updatedAt);
  let dropped = 0;
  return sorted.map((s) => {
    if (s.id === activeSessionId) return s;
    if (dropped >= Math.ceil(sorted.length / 2)) return s; // drop at most half
    dropped++;
    return { ...s, messages: [] };
  });
}

// --- Degradation Level 4: Keep only active session ---
function keepOnlyActiveSession(
  sessions: SessionData[],
  activeSessionId: string | null
): SessionData[] {
  return sessions.map((s) =>
    s.id === activeSessionId ? s : { ...s, messages: [] }
  );
}

export function persistSessionSnapshot(
  snapshot: SessionStoreSnapshot,
  adapter: StorageAdapter = getDefaultStorageAdapter()
): void {
  const baseDoc = {
    _schemaVersion: SCHEMA_VERSION as typeof SCHEMA_VERSION,
    folders: snapshot.folders,
    activeFolderId: snapshot.activeFolderId,
    activeSessionId: snapshot.activeSessionId,
    updatedAt: Date.now(),
  };
  const activeId = snapshot.activeSessionId;

  // Progressive degradation: try each level until payload fits
  const levels: Array<(s: SessionData[]) => SessionData[]> = [
    (s) => trimToolOutputs(s),
    (s) => stripNonActiveToolOutputs(s, activeId),
    (s) => dropOldestSessionMessages(s, activeId),
    (s) => keepOnlyActiveSession(s, activeId),
  ];

  let sessions = snapshot.sessions;
  let serialized = '';

  for (let level = 0; level < levels.length; level++) {
    sessions = levels[level](sessions);
    const doc: SessionDocumentV3 = { ...baseDoc, sessions };
    serialized = JSON.stringify(doc);
    if (serialized.length <= MAX_PERSIST_SIZE) break;
    if (level < levels.length - 1) {
      console.warn(`[persist] Level ${level} still exceeds 4MB (${(serialized.length / 1024 / 1024).toFixed(1)}MB), escalating`);
    }
  }

  // Backup current data (also wrapped in try/catch -- backup can also exceed quota)
  try {
    const current = adapter.getItem(STORAGE_KEY);
    if (current) {
      adapter.setItem(STORAGE_BACKUP_KEY, current);
    }
  } catch {
    // Backup failed -- proceed with save anyway, losing rollback ability
    console.warn('[persist] Backup write failed (quota), proceeding with save');
  }

  try {
    adapter.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.error('[persist] Failed to save session snapshot after all degradation levels:', err);
  }
}
```

- [ ] **Step 3b: Write additional test for multi-level degradation**

```typescript
it('should survive even when aggressive trimming is needed', () => {
  // Simulate a scenario where even trimmed data is huge (many sessions)
  const hugeOutput = 'x'.repeat(200_000);
  const sessions = Array.from({ length: 50 }, (_, si) => ({
    id: `s-${si}`,
    folderId: 'f1',
    source: 'local' as const,
    name: `Session ${si}`,
    cwd: '/test',
    messages: Array.from({ length: 10 }, (_, mi) => ({
      id: `msg-${si}-${mi}`,
      role: 'assistant' as const,
      content: 'Response',
      toolCalls: [{ id: `t-${si}-${mi}`, name: 'Bash', input: { command: 'ls' }, output: hugeOutput, expanded: false }],
      timestamp: Date.now(),
    })),
    cost: 0, inputTokens: 0, outputTokens: 0,
    createdAt: Date.now(), updatedAt: Date.now() - si * 1000,
  }));

  const snapshot: SessionStoreSnapshot = {
    folders: [{ id: 'f1', name: 'Test', path: '/test', kind: 'local', hasSyncedClaudeHistory: false, createdAt: Date.now(), updatedAt: Date.now() }],
    sessions,
    activeFolderId: 'f1',
    activeSessionId: 's-0',
  };

  expect(() => persistSessionSnapshot(snapshot, mockAdapter)).not.toThrow();
  const stored = mockAdapter.getItem('codeye.session-store');
  expect(stored).not.toBeNull();
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/storage/sessionPersistence.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/sessionPersistence.ts src/storage/sessionPersistence.test.ts
git commit -m "fix: guard localStorage persistence against size overflow (RC-5)"
```

---

## Chunk 2: Dropdown Rendering Architecture (RC-2)

### Task 3: Create a Portal-based dropdown to escape overflow:hidden

**Files:**
- Create: `src/components/Chat/DropdownPortal.tsx`
- Modify: `src/components/Chat/ModelConfigSelector.tsx`
- Modify: `src/components/Chat/InputFooter.tsx`
- Modify: `src/styles/components/config-selector.css`
- Modify: `src/styles/components/input-area.css`

The core bug: Both model and permission dropdowns use `position: absolute` inside nested `overflow: hidden` containers (`.app-main` -> `.primary-pane` -> `.chat-panel`). No z-index fix works because `overflow: hidden` clips regardless. The dropdown must render outside the overflow chain via React Portal.

- [ ] **Step 1: Create `DropdownPortal.tsx` with resize repositioning**

```tsx
// src/components/Chat/DropdownPortal.tsx
import { useEffect, useLayoutEffect, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  children: ReactNode;
  className?: string;
  align?: 'center' | 'left';
}

export default function DropdownPortal({ anchorRef, open, children, className = '', align = 'center' }: Props) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const dropdown = dropdownRef.current;
    if (!anchor || !dropdown) return;

    const rect = anchor.getBoundingClientRect();
    const left = align === 'center'
      ? rect.left + rect.width / 2
      : rect.left;

    dropdown.style.position = 'fixed';
    dropdown.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.transform = align === 'center' ? 'translateX(-50%)' : '';
    dropdown.style.zIndex = '9999';
  }, [anchorRef, align]);

  // Position on open and on layout changes
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  // Reposition on resize and scroll
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true); // capture for nested scrolls
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, reposition]);

  if (!open) return null;

  return createPortal(
    <div ref={dropdownRef} className={className}>
      {children}
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: Refactor `ModelConfigSelector` to use portal**

Full replacement of `src/components/Chat/ModelConfigSelector.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import {
  MODELS,
  EFFORT_LEVELS,
  getAllowedEfforts,
  getModelInfo,
  getEffortInfo,
  modelSupportsEffort,
} from '../../data/models';
import type { ModelId, EffortLevel } from '../../types';
import DropdownPortal from './DropdownPortal';

const tierLabels: Record<string, string> = {
  premium: '$$$',
  standard: '$$',
  fast: '$',
};

export default function ModelConfigSelector() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const model = useChatStore((s) => s.model);
  const effort = useChatStore((s) => s.effort);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const setModel = useChatStore((s) => s.setModel);
  const setEffort = useChatStore((s) => s.setEffort);
  const currentModel = getModelInfo(model);
  const currentEffort = getEffortInfo(effort);
  const supportsEffort = modelSupportsEffort(model);
  const allowedEfforts = getAllowedEfforts(model);
  const visibleEfforts = EFFORT_LEVELS.filter((entry) => allowedEfforts.includes(entry.id));

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="config-selector">
      <button
        ref={triggerRef}
        className="config-selector-trigger"
        onClick={() => setOpen(!open)}
        disabled={isStreaming}
        title={`${currentModel.label} · ${supportsEffort ? currentEffort.label : 'Thinking unavailable'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="config-selector-model">{currentModel.shortLabel}</span>
        <span className="config-selector-sep">·</span>
        <span className="config-selector-effort">{supportsEffort ? currentEffort.shortLabel : 'N/A'}</span>
        <ChevronDown size={11} strokeWidth={2} className={`config-selector-chevron ${open ? 'open' : ''}`} />
      </button>
      <DropdownPortal anchorRef={triggerRef} open={open} className="config-selector-dropdown">
        <div ref={dropdownRef}>
          <div className="config-section">
            <span className="config-section-title">Model</span>
            {MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`config-option ${m.id === model ? 'active' : ''}`}
                onClick={() => setModel(m.id as ModelId)}
              >
                <div className="config-option-info">
                  <span className="config-option-label">{m.label}</span>
                  <span className="config-option-desc">{m.description}</span>
                </div>
                <span className="config-tier-badge">{tierLabels[m.tier]}</span>
              </button>
            ))}
          </div>
          <div className="config-divider" />
          <div className="config-section">
            <span className="config-section-title">Thinking</span>
            {supportsEffort ? (
              visibleEfforts.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`config-option ${entry.id === effort ? 'active' : ''}`}
                  onClick={() => setEffort(entry.id as EffortLevel)}
                >
                  <div className="config-option-info">
                    <span className="config-option-label">{entry.label}</span>
                    <span className="config-option-desc">{entry.description}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="config-option-hint">Thinking controls are not available for this model.</div>
            )}
          </div>
        </div>
      </DropdownPortal>
    </div>
  );
}
```

- [ ] **Step 3: Refactor permission selector in `InputFooter` to use portal**

In `src/components/Chat/InputFooter.tsx`, apply the same pattern:
- Add `import DropdownPortal from './DropdownPortal';`
- Rename `containerRef` to `triggerRef` and attach it to the button
- Add a `dropdownRef` for click-outside detection inside the portal content
- Replace the inline `{open && <div className="permission-dropdown">...}` with `<DropdownPortal anchorRef={triggerRef} open={open} className="permission-dropdown" align="left">` wrapping the dropdown content
- Update click-outside handler to check `triggerRef` and `dropdownRef` instead of `containerRef`

```tsx
import DropdownPortal from './DropdownPortal';
// ... existing imports ...

export default function InputFooter() {
  const permissionMode = useUIStore((s) => s.permissionMode);
  const setPermissionMode = useUIStore((s) => s.setPermissionMode);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = permissionOptions.find((o) => o.id === permissionMode) ?? permissionOptions[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleSelect = (mode: PermissionMode) => {
    setPermissionMode(mode);
    setOpen(false);
  };

  return (
    <div className="input-footer">
      <div className="input-footer-left">
        <ModelConfigSelector />
        <div className="permission-selector">
          <button
            ref={triggerRef}
            className={`permission-selector-trigger permission-trigger--${permissionMode}`}
            onClick={() => setOpen((v) => !v)}
            type="button"
            title="Permission mode"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="permission-dot" style={{ background: current.color }} />
            <span className="permission-trigger-label">{current.label}</span>
            <ChevronDown size={11} strokeWidth={2} className={`permission-chevron ${open ? 'open' : ''}`} />
          </button>
          <DropdownPortal anchorRef={triggerRef} open={open} className="permission-dropdown" align="left">
            <div ref={dropdownRef}>
              {permissionOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={`permission-option ${opt.id === permissionMode ? 'active' : ''}`}
                  onClick={() => handleSelect(opt.id)}
                  type="button"
                >
                  <span className="permission-option-dot" style={{ background: opt.color }} />
                  <div className="permission-option-info">
                    <span className="permission-option-label">{opt.label}</span>
                    <span className="permission-option-desc">{opt.description}</span>
                  </div>
                  {opt.id === permissionMode && (
                    <Check size={13} strokeWidth={2} className="permission-check" />
                  )}
                </button>
              ))}
            </div>
          </DropdownPortal>
        </div>
      </div>
      <div className="input-footer-right">
        <SessionStats />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update CSS -- remove absolute positioning from dropdown classes**

In `src/styles/components/config-selector.css`, update `.config-selector-dropdown`:

```css
.config-selector-dropdown {
  /* Removed: position, bottom, left, transform, z-index -- now set by DropdownPortal */
  min-width: 240px;
  background: var(--bg-base);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--space-1);
  animation: configFadeIn 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes configFadeIn {
  from {
    opacity: 0;
    /* Removed translateX -- portal handles transform */
  }
  to {
    opacity: 1;
  }
}
```

In `src/styles/components/input-area.css`, update `.permission-dropdown`:

```css
.permission-dropdown {
  /* Removed: position, bottom, left, z-index, transform-origin, animation -- portal handles positioning */
  min-width: 220px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--space-1);
  animation: permissionSlideIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes permissionSlideIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Chat/DropdownPortal.tsx src/components/Chat/ModelConfigSelector.tsx src/components/Chat/InputFooter.tsx src/styles/components/config-selector.css src/styles/components/input-area.css
git commit -m "fix: render dropdowns via portal to escape overflow:hidden (RC-2)"
```

---

## Chunk 3: Scroll Behavior & Message List (RC-3)

### Task 4: Fix auto-scroll to only trigger when user is at bottom

**Files:**
- Modify: `src/components/Chat/MessageList.tsx`

The bug: The `useEffect` scrolls to bottom on every `messages` change. During streaming, `messages` changes multiple times per second. If the user scrolls up to read earlier content, they get yanked back to the bottom.

- [ ] **Step 1: Add "is at bottom" detection and modify scroll behavior**

Replace the scroll-related code in `MessageList.tsx` with:

```tsx
const isAtBottomRef = useRef(true);
const prevMsgLenRef2 = useRef(0);

// Track user scroll position
useEffect(() => {
  const el = parentRef.current;
  if (!el) return;
  const handleScroll = () => {
    const threshold = 80;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };
  el.addEventListener('scroll', handleScroll, { passive: true });
  return () => el.removeEventListener('scroll', handleScroll);
}, []);

// Force scroll when user sends a new message (detected by new user message appearing)
useEffect(() => {
  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  if (userMsgCount > prevMsgLenRef2.current) {
    isAtBottomRef.current = true;
  }
  prevMsgLenRef2.current = userMsgCount;
}, [messages]);

// Auto-scroll only when at bottom
useEffect(() => {
  if (!isAtBottomRef.current) return;
  if (useVirtual) {
    if (turns.length > 0) {
      virtualizer.scrollToIndex(turns.length - 1, { align: 'end' });
    }
  } else if (parentRef.current) {
    // Use instant during streaming to avoid jank from queued smooth animations
    const isStreaming = messages[messages.length - 1]?.isStreaming;
    parentRef.current.scrollTo({
      top: parentRef.current.scrollHeight,
      behavior: isStreaming ? 'instant' : 'smooth',
    });
  }
}, [messages, useVirtual, turns.length, virtualizer]);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Chat/MessageList.tsx
git commit -m "fix: only auto-scroll when user is at bottom of message list (RC-3)"
```

---

## Chunk 4: Stale State & Stream Reliability (RC-4)

### Task 5: Fix `getActions()` stale closure

**Files:**
- Modify: `src/hooks/useClaudeChat.ts` (`getActions` function)

The bug: `getLastAssistantContent` captures `s.messages` at call time. During streaming, this closure reads stale messages. Note: the other returned actions (`appendAssistantContent`, etc.) are Zustand store actions that internally use `set()` -- they always operate on current state and are NOT affected by this bug.

- [ ] **Step 1: Fix `getLastAssistantContent` to read fresh state**

```typescript
function getActions(): StoreActions {
  const s = useChatStore.getState();
  return {
    // Zustand actions are stable -- they use set() internally, always current state
    appendAssistantContent: s.appendAssistantContent,
    finishStreaming: s.finishStreaming,
    addToolCall: s.addToolCall,
    updateToolResult: s.updateToolResult,
    updateCost: s.updateCost,
    setClaudeSessionId: s.setClaudeSessionId,
    setRuntimeSlashCommands,
    // Pure read -- must get fresh state each call
    getLastAssistantContent: () => {
      const current = useChatStore.getState();
      const last = current.messages[current.messages.length - 1];
      if (last?.role !== 'assistant') return null;
      return last.content;
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useClaudeChat.ts
git commit -m "fix: read fresh state in getLastAssistantContent closure (RC-4)"
```

### Task 6: Replace `isStreaming` guard with `activeStreamId` token

**Files:**
- Modify: `src/stores/chatStore.ts` (`appendAssistantContent`, `addToolCall`, `updateToolResult`, `startAssistantMessage`, `finishStreaming`, `clearMessages`, `loadSession`)
- Test: `src/stores/chatStore.test.ts`

The bug: If `finishStreaming()` is called while content is still being delivered (e.g., user presses Escape), subsequent `appendAssistantContent` and `addToolCall` calls silently drop data.

**Why a 500ms grace period is NOT enough**: A grace period only uses time, not identity. If user presses Escape and immediately sends a new message (starting a new stream), chunks from the OLD stream arriving within the grace window would pollute the NEW stream's messages. The same problem occurs on session switch: old stream chunks leak into the new session.

**Fix**: Add an `activeStreamId` token (UUID). `startAssistantMessage` generates a new token; all `append`/`addToolCall`/`updateToolResult` calls must pass the token and it must match. On `clearMessages`/`loadSession`, the token resets to `null`, rejecting any in-flight chunks from the old stream.

- [ ] **Step 1: Write failing test for stream isolation**

Add to `src/stores/chatStore.test.ts`:

```typescript
describe('activeStreamId isolation', () => {
  it('should reject content from a stale stream after a new stream starts', () => {
    const store = useChatStore.getState();

    // Start first stream
    store.startAssistantMessage();
    const firstStreamId = useChatStore.getState().activeStreamId;
    expect(firstStreamId).toBeTruthy();

    store.appendAssistantContent('hello from stream 1', firstStreamId!);
    expect(useChatStore.getState().messages[0].content).toBe('hello from stream 1');

    // Finish first stream, start second
    store.finishStreaming();
    store.addUserMessage('next question');
    store.startAssistantMessage();
    const secondStreamId = useChatStore.getState().activeStreamId;
    expect(secondStreamId).not.toBe(firstStreamId);

    // Late chunk from first stream arrives -- must be rejected
    store.appendAssistantContent(' late chunk', firstStreamId!);
    const lastMsg = useChatStore.getState().messages[useChatStore.getState().messages.length - 1];
    expect(lastMsg.content).toBe(''); // new assistant message, no stale content
  });

  it('should reject content after clearMessages resets activeStreamId', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    const streamId = useChatStore.getState().activeStreamId;

    store.clearMessages();

    // Old stream chunk should be rejected
    store.appendAssistantContent('stale', streamId!);
    expect(useChatStore.getState().messages.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/chatStore.test.ts --reporter=verbose`
Expected: FAIL (activeStreamId doesn't exist yet)

- [ ] **Step 3: Add `activeStreamId` to chatStore**

```typescript
// Add to ChatState interface:
activeStreamId: string | null;

// Add to initial state:
activeStreamId: null,

// Modify startAssistantMessage -- generate new stream token:
startAssistantMessage: () =>
    set((state) => ({
      isStreaming: true,
      activeStreamId: crypto.randomUUID(),
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          toolCalls: [],
          timestamp: Date.now(),
          isStreaming: true,
        },
      ],
    })),

// Modify appendAssistantContent -- require matching streamId:
appendAssistantContent: (content, streamId) =>
    set((state) => {
      // Reject if streamId doesn't match (stale/cross-session content)
      if (streamId && state.activeStreamId !== streamId) return state;
      // Also reject if not streaming and no valid streamId
      if (!state.isStreaming && !streamId) return state;

      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      } else {
        msgs.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          toolCalls: [],
          timestamp: Date.now(),
          isStreaming: state.isStreaming,
        });
      }
      return { messages: msgs };
    }),

// Modify addToolCall -- same pattern:
addToolCall: (tool, streamId) =>
    set((state) => {
      if (streamId && state.activeStreamId !== streamId) return state;
      if (!state.isStreaming && !streamId) return state;
      // ... rest of existing tool call logic unchanged ...
    }),

// Modify updateToolResult -- same pattern:
updateToolResult: (toolId, output, streamId) =>
    set((state) => {
      if (streamId && state.activeStreamId !== streamId) return state;
      // ... rest of existing logic unchanged ...
    }),

// finishStreaming -- keep activeStreamId alive (don't null it here,
// so late chunks with matching ID are still accepted briefly):
finishStreaming: () =>
    set((state) => {
      const msgs = state.messages.map((m) => {
        if (!m.isStreaming) return m;
        const toolCalls = m.toolCalls.map((t) =>
          t.output === undefined ? { ...t, output: '' } : t
        );
        return { ...m, isStreaming: false, toolCalls };
      });
      return { messages: msgs, isStreaming: false };
      // NOTE: activeStreamId preserved -- will be replaced by next startAssistantMessage
      // or nulled by clearMessages/loadSession
    }),

// clearMessages -- reset stream token to reject all in-flight chunks:
clearMessages: () => set({
  messages: [], cost: 0, inputTokens: 0, outputTokens: 0,
  isStreaming: false, activeStreamId: null,
  claudeSessionId: null, pendingMessages: [], pendingApprovals: {}
}),

// loadSession -- reset stream token:
loadSession: (data) =>
    set({
      messages: data.messages,
      cost: data.cost,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      pendingMessages: [],
      pendingApprovals: {},
      claudeSessionId: data.claudeSessionId ?? null,
      model: normalizeModelId(data.model),
      isStreaming: false,
      activeStreamId: null,
    }),
```

- [ ] **Step 4: Update ChatState interface for new signatures**

```typescript
// In ChatState interface, update method signatures:
appendAssistantContent: (content: string, streamId?: string) => void;
addToolCall: (tool: ToolCallDisplay, streamId?: string) => void;
updateToolResult: (toolId: string, output: string, streamId?: string) => void;
```

- [ ] **Step 5: Update `useClaudeChat.ts` to pass `activeStreamId` through**

In `src/hooks/useClaudeChat.ts`, update `getActions()` to capture and pass the stream ID:

```typescript
function getActions(): StoreActions & { streamId: string | null } {
  const s = useChatStore.getState();
  return {
    appendAssistantContent: (content: string) => {
      const streamId = useChatStore.getState().activeStreamId;
      s.appendAssistantContent(content, streamId ?? undefined);
    },
    addToolCall: (tool: ToolCallDisplay) => {
      const streamId = useChatStore.getState().activeStreamId;
      s.addToolCall(tool, streamId ?? undefined);
    },
    updateToolResult: (toolId: string, output: string) => {
      const streamId = useChatStore.getState().activeStreamId;
      s.updateToolResult(toolId, output, streamId ?? undefined);
    },
    finishStreaming: s.finishStreaming,
    updateCost: s.updateCost,
    setClaudeSessionId: s.setClaudeSessionId,
    setRuntimeSlashCommands,
    getLastAssistantContent: () => {
      const current = useChatStore.getState();
      const last = current.messages[current.messages.length - 1];
      if (last?.role !== 'assistant') return null;
      return last.content;
    },
    streamId: s.activeStreamId,
  };
}
```

Also update the `StreamBatcher` callback in the `useEffect` to use stream-aware append:

```typescript
const textBatcher = new StreamBatcher((chunks) => {
  const combined = chunks.join('');
  if (combined) {
    const streamId = useChatStore.getState().activeStreamId;
    useChatStore.getState().appendAssistantContent(combined, streamId ?? undefined);
  }
});
```

- [ ] **Step 6: Update `StoreActions` type in `messageHandler.ts`**

Ensure the `StoreActions` interface in `src/services/messageHandler.ts` matches the new signatures.

- [ ] **Step 7: Run all chatStore and useClaudeChat-related tests**

Run: `npx vitest run src/stores/chatStore.test.ts src/services/messageHandler.test.ts --reporter=verbose`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/stores/chatStore.ts src/stores/chatStore.test.ts src/hooks/useClaudeChat.ts src/services/messageHandler.ts
git commit -m "fix: add activeStreamId token to prevent cross-stream content pollution (RC-4)"
```

---

## Chunk 5: CSS & Layout Fixes (RC-6 + alignment)

### Task 7: Investigate and conditionally fix `contain: layout paint` menu positioning (RC-6)

**Files:**
- Possibly modify: `src/styles/components/sidebar.css` (`.sidebar-content`)

**Risk**: `.project-header` already has `position: relative`. The `contain: layout paint` on `.sidebar-content` *theoretically* creates a new containing block, but `overflow-y: auto` on `.sidebar-content` already creates a scroll container which affects absolute positioning anyway. Removing `contain` may degrade sidebar scroll perf (the whole reason it was added).

**Approach**: Verify-first, change-if-broken.

- [ ] **Step 1: Screenshot the folder context menu in current state**

Launch the app, add a folder with multiple sessions, click the "..." menu button on a folder header. Take a Playwright screenshot to `screenshots/folder-menu-before.png`.

**Decision gate**:
- If menu appears directly below the header: **RC-6 is NOT a real bug**. Skip the CSS change. Commit screenshot as evidence.
- If menu is offset or appears at wrong position: proceed with Step 2.

- [ ] **Step 2 (only if menu is mispositioned): Change `contain` with perf verification**

```css
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1) 0;
  contain: style; /* Changed from 'layout paint' -- layout/paint breaks absolute positioning of child menus */
}
```

- [ ] **Step 3 (only if Step 2 applied): Verify scroll performance**

Load a folder with 50+ sessions. Scroll the sidebar rapidly. Verify:
- No visible jank or frame drops
- FPS stays above 50fps (check via DevTools Performance tab or `performance.mark`)

Take after-screenshot to `screenshots/folder-menu-after.png`.

- [ ] **Step 4: Commit**

```bash
git add src/styles/components/sidebar.css screenshots/
# If fix applied:
git commit -m "fix: change sidebar-content contain to style for menu positioning (RC-6, perf verified)"
# If no fix needed:
git commit -m "docs: verify folder menu positioning is correct (RC-6 not reproduced)"
```

### Task 8: Align activity bar top padding with macOS traffic lights

**Files:**
- Modify: `src/styles/components/activity-bar.css`

The bug: Sidebar header has `padding-top: 42px` for macOS traffic lights, but the activity bar only has `padding: 12px 0`. This misaligns the first button with the sidebar title.

- [ ] **Step 1: Use `var(--titlebar-h)` for activity bar top padding**

```css
.activity-bar {
  width: var(--activity-bar-w);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--titlebar-h) 0 var(--space-3);
  gap: var(--space-2);
  border-right: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/components/activity-bar.css
git commit -m "fix: align activity bar top padding with macOS traffic lights"
```

### Task 9: Add `-webkit-app-region: no-drag` to sidebar interactive elements

**Files:**
- Modify: `src/styles/components/sidebar.css`

The bug: `.sidebar-header` has `-webkit-app-region: drag`, which can block clicks on child buttons in Electron.

- [ ] **Step 1: Add `no-drag` to interactive children**

```css
.sidebar-actions {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.sidebar-search-wrapper {
  padding: 0 var(--space-3) var(--space-2);
  -webkit-app-region: no-drag;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/components/sidebar.css
git commit -m "fix: add no-drag to sidebar interactive elements for Electron"
```

---

## Chunk 6: Session Switching Data Safety

### Task 10: Investigate and fix session switch data race (test-first)

**Files:**
- Test: `src/storage/bootstrap.test.ts` (new, or add to existing)
- Possibly modify: `src/storage/bootstrap.ts`, `src/components/Session/SessionList.tsx`, `src/App.tsx`

**Context**: `syncChatToSession()` reads `activeSessionId` from `useSessionStore.getState()` at execution time (not a captured value). `handleSelectSession` already saves the current session explicitly before switching. So the described race ("debounced timer saves new session data under old ID") may not actually exist.

**Approach**: Write a failing test FIRST to prove the race exists. If the test passes (no race), skip the refactoring. If it fails, apply the fix.

**Important**: `handleSelectSession` at `SessionList.tsx:112` already calls `saveSessionMessages(activeSessionId, ...)` manually before switching. And `syncChatToSession` at `bootstrap.ts:166` reads `activeSessionId` fresh via `useSessionStore.getState()`. The timer-based sync should be safe because by the time it fires, `activeSessionId` has already been updated to the new session.

- [ ] **Step 1: Write a race-condition reproduction test**

Create `src/storage/bootstrap.test.ts` (or add to existing test file):

```typescript
import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';

describe('session switch data safety', () => {
  beforeEach(() => {
    useChatStore.getState().clearMessages();
    useSessionStore.setState({ folders: [], sessions: [], activeFolderId: null, activeSessionId: null });
  });

  it('debounced sync should NOT save new session data under old session ID', async () => {
    const sessionStore = useSessionStore.getState();
    const folder = sessionStore.createFolder('/test', 'Test');
    const sessionA = sessionStore.createSession('A', folder.id);
    sessionStore.setActiveSession(sessionA.id);

    // Simulate: user finishes chatting in session A
    useChatStore.getState().addUserMessage('Hello from A');
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().appendAssistantContent('Reply to A');
    useChatStore.getState().finishStreaming();

    // At this point, the debounced sync timer (1000ms) is ticking...
    // Now user switches to session B
    const sessionB = sessionStore.createSession('B', folder.id);
    sessionStore.setActiveSession(sessionB.id);

    // Wait for debounce to fire (1100ms > CHAT_SYNC_DEBOUNCE_MS=1000ms)
    await new Promise((r) => setTimeout(r, 1100));

    // Verify: session A should have its messages, session B should be empty
    const savedA = sessionStore.getSession(sessionA.id);
    const savedB = sessionStore.getSession(sessionB.id);

    // If this fails: the debounced sync saved B's empty data under A's ID
    expect(savedA?.messages.length).toBeGreaterThan(0);
    expect(savedB?.messages.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/storage/bootstrap.test.ts --reporter=verbose`

**Decision gate**:
- If **test PASSES**: The race doesn't exist in practice (because `syncChatToSession` reads fresh `activeSessionId`). Skip the bootstrap refactoring -- just add a comment explaining why it's safe. Commit the test as documentation.
- If **test FAILS**: Proceed with Steps 3-5 below.

- [ ] **Step 3 (only if test fails): Refactor `bootstrap.ts` -- promote timer to module level**

Move `chatSyncTimer` from closure-scoped to module-level `_chatSyncTimer`. Export `flushPendingSync()`. Full refactoring shown below (all 4 references to `chatSyncTimer` at lines 181, 221, 222, 233-235 must be updated):

```typescript
let _chatSyncTimer: ReturnType<typeof setTimeout> | null = null;

export function flushPendingSync(): void {
  if (_chatSyncTimer) {
    clearTimeout(_chatSyncTimer);
    _chatSyncTimer = null;
    syncChatToSession();
  }
}

// Inside startSessionAutoPersistence:
// Replace all 'chatSyncTimer' with '_chatSyncTimer'
// Remove the local 'let chatSyncTimer' declaration
// Update the cleanup function to use _chatSyncTimer
```

- [ ] **Step 4 (only if test fails): Call `flushPendingSync` in SessionList + App**

Add `flushPendingSync()` call at top of `handleSelectSession` in `SessionList.tsx` and before `Cmd+N` handler in `App.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/storage/bootstrap.ts src/storage/bootstrap.test.ts
# If race was real:
git commit -m "fix: flush pending sync before session switch (verified with race test)"
# If race was NOT real:
git commit -m "test: verify session switch sync is race-free (no fix needed)"
```

---

## Chunk 7: Automated Regression Tests (P2)

### Task 11: Add automated tests to prevent regression of all fixed bugs

**Files:**
- Create: `src/tests/regression-dropdown.test.tsx` (vitest + testing-library)
- Create: `src/tests/regression-scroll.test.tsx`
- Modify: `src/stores/sessionStore.test.ts` (CLI sync test already added in Task 1)
- Modify: `src/stores/chatStore.test.ts` (stream isolation test already added in Task 6)

These tests are the "permanent guard" -- if any future change re-introduces a bug, these tests catch it.

- [ ] **Step 1: Dropdown portal test -- verify dropdown is not clipped**

```typescript
// src/tests/regression-dropdown.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ModelConfigSelector from '../components/Chat/ModelConfigSelector';
import { useChatStore } from '../stores/chatStore';

describe('Dropdown portal (RC-2 regression)', () => {
  it('model selector dropdown should render in document.body, not inside overflow:hidden', () => {
    // Set up minimal chatStore state
    useChatStore.setState({ model: 'sonnet', effort: 'medium', isStreaming: false });

    render(<ModelConfigSelector />);

    const trigger = screen.getByRole('button', { name: /Sonnet/i });
    fireEvent.click(trigger);

    // The dropdown should be rendered via portal in document.body
    const dropdown = document.querySelector('.config-selector-dropdown');
    expect(dropdown).not.toBeNull();
    expect(dropdown!.closest('.chat-panel')).toBeNull(); // NOT inside chat-panel
    expect(dropdown!.closest('.app-main')).toBeNull(); // NOT inside app-main

    // Dropdown should have position: fixed (set by portal)
    const style = window.getComputedStyle(dropdown!);
    expect(style.position).toBe('fixed');
  });
});
```

- [ ] **Step 2: Scroll behavior test -- verify no scroll hijack during streaming**

```typescript
// src/tests/regression-scroll.test.tsx
import { render } from '@testing-library/react';
import MessageList from '../components/Chat/MessageList';
import { useChatStore } from '../stores/chatStore';

describe('Auto-scroll (RC-3 regression)', () => {
  it('should NOT auto-scroll when user has scrolled up', () => {
    // Fill chatStore with enough messages to enable scrolling
    const messages = Array.from({ length: 20 }, (_, i) => ({
      id: `msg-${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i} content that is long enough to take space`,
      toolCalls: [],
      timestamp: Date.now() + i,
    }));
    useChatStore.setState({ messages, isStreaming: true });

    const { container } = render(<MessageList />);
    const scrollContainer = container.querySelector('.message-list');
    expect(scrollContainer).not.toBeNull();

    // Simulate user scrolling to top
    Object.defineProperty(scrollContainer!, 'scrollHeight', { value: 2000 });
    Object.defineProperty(scrollContainer!, 'clientHeight', { value: 500 });
    Object.defineProperty(scrollContainer!, 'scrollTop', { value: 0, writable: true });
    fireEvent.scroll(scrollContainer!);

    // Add a new streaming message
    const spy = vi.spyOn(scrollContainer!, 'scrollTo');
    useChatStore.getState().appendAssistantContent('new content');

    // scrollTo should NOT have been called (user is at top)
    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: CLI sync active session protection test (already in Task 1)**

Verify the test from Task 1 Step 1 exists and passes.

- [ ] **Step 4: Stream isolation test (already in Task 6)**

Verify the tests from Task 6 Step 1 exist and pass.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass, including the new regression tests.

- [ ] **Step 6: Commit**

```bash
git add src/tests/regression-dropdown.test.tsx src/tests/regression-scroll.test.tsx
git commit -m "test: add automated regression tests for RC-2 dropdown and RC-3 scroll"
```

---

## Verification Checklist

After all tasks are complete, verify each fix:

- [ ] **Session swallowing (RC-1)**: Open Session A, send a message, wait for response. Trigger CLI history sync. Session A messages must NOT change.
- [ ] **Dropdown visibility (RC-2)**: Open model selector dropdown with sidebar open. Dropdown appears fully visible above the button, not clipped.
- [ ] **Permission dropdown (RC-2)**: Same test for permission selector.
- [ ] **Scroll behavior (RC-3)**: During streaming, scroll up to read older messages. View does NOT jump to bottom. Send a new message -- view returns to bottom.
- [ ] **Streaming scroll perf (RC-3)**: During active streaming, verify no scroll jank (uses `instant` not `smooth`).
- [ ] **Session switch safety (RC-1 + Task 10)**: Send a message, get response, immediately click another session. Click back -- messages still there.
- [ ] **Large session persistence (RC-5)**: Create a session with many tool calls. Close and reopen app. Session loads correctly.
- [ ] **Folder menu position (RC-6)**: Click "..." on a project folder. Menu appears directly below the header, not at bottom of sidebar.
- [ ] **Cmd+N (Task 10)**: During streaming, press Cmd+N. Current session saved, new session clean.
- [ ] **Dropdown resize (Task 3)**: Open model selector, then resize window. Dropdown repositions correctly.

---

## Build Verification

- [ ] Run `npx tsc --noEmit` -- zero type errors
- [ ] Run `npx vitest run` -- all tests pass
- [ ] Run `npm run dev` -- app starts without console errors
