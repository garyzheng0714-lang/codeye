# Sidebar Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely rewrite the sidebar session list to a clean Codex-style pattern — flat session rows, section-header folders, archive interaction, no staggered animations.

**Architecture:** Replace the current 490-line SessionList.tsx with three focused components (ProjectHeader, SessionRow, SessionList) and a new CSS file. The new design eliminates session dots, subtitle lines, chevrons, context menus, and staggered animations. Sidebar.tsx is simplified to remove duplicated sync logic.

**Tech Stack:** React (memo, useCallback, useState), Zustand (individual selectors), CSS grid transitions, Lucide icons

---

## Chunk 1: Utility + Components

### Task 1: Create compact time formatter

**Files:**
- Create: `src/utils/timeFormat.ts`

- [ ] **Step 1: Create the time formatter**

```typescript
// src/utils/timeFormat.ts

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

export function formatCompactTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 0) return '';

  if (diff < HOUR) {
    const m = Math.max(1, Math.floor(diff / MINUTE));
    return `${m}m`;
  }
  if (diff < DAY) {
    return `${Math.floor(diff / HOUR)}h`;
  }
  if (diff < WEEK) {
    return `${Math.floor(diff / DAY)}d`;
  }
  if (diff < DAY * 30) {
    return `${Math.floor(diff / WEEK)}w`;
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function isOlderThan3Days(timestamp: number): boolean {
  return Date.now() - timestamp > 3 * DAY;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/timeFormat.ts
git commit -m "feat: add compact time formatter for sidebar"
```

---

### Task 2: Create ProjectHeader component

**Files:**
- Create: `src/components/Session/ProjectHeader.tsx`

- [ ] **Step 1: Create ProjectHeader**

```typescript
// src/components/Session/ProjectHeader.tsx
import { memo } from 'react';
import { FolderOpen, Folder } from 'lucide-react';

interface Props {
  name: string;
  isOpen: boolean;
  sessionCount: number;
  isSyncing: boolean;
  onClick: () => void;
}

export default memo(function ProjectHeader({
  name,
  isOpen,
  sessionCount,
  isSyncing,
  onClick,
}: Props) {
  const Icon = isOpen ? FolderOpen : Folder;

  return (
    <div
      role="button"
      tabIndex={0}
      className="project-header"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <Icon
        size={14}
        strokeWidth={isOpen ? 0 : 2}
        fill={isOpen ? 'currentColor' : 'none'}
        className="project-header-icon"
      />
      <span className={`project-header-name ${isOpen ? 'open' : ''}`}>{name}</span>
      {isSyncing && (
        <span className="project-sync">
          <span className="project-sync-dot" />
          <span className="project-sync-label">syncing</span>
        </span>
      )}
      {!isOpen && !isSyncing && sessionCount > 0 && (
        <span className="project-count">{sessionCount}</span>
      )}
    </div>
  );
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Session/ProjectHeader.tsx
git commit -m "feat: add ProjectHeader component for sidebar redesign"
```

---

### Task 3: Create SessionRow component

**Files:**
- Create: `src/components/Session/SessionRow.tsx`

- [ ] **Step 1: Create SessionRow**

```typescript
// src/components/Session/SessionRow.tsx
import { memo, useRef, useState } from 'react';
import { Archive, Link } from 'lucide-react';
import { formatCompactTime, isOlderThan3Days } from '../../utils/timeFormat';
import type { SessionData } from '../../types';

interface Props {
  session: SessionData;
  isActive: boolean;
  isConfirming: boolean;
  onSelect: () => void;
  onArchiveClick: () => void;
  onConfirm: () => void;
  onCancelConfirm: () => void;
  onRename: (name: string) => void;
}

function getSessionTitle(session: SessionData): string {
  const firstUserMsg = session.messages.find((m) => m.role === 'user' && m.content.trim());
  if (!firstUserMsg) return session.name;
  return firstUserMsg.content
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 80);
}

export default memo(function SessionRow({
  session,
  isActive,
  isConfirming,
  onSelect,
  onArchiveClick,
  onConfirm,
  onCancelConfirm,
  onRename,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const title = getSessionTitle(session);
  const isOld = isOlderThan3Days(session.updatedAt);

  const commitRename = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancelConfirm();
    setIsEditing(true);
    setEditName(session.name);
  };

  if (isEditing) {
    return (
      <div className="session-row">
        <input
          ref={inputRef}
          className="session-rename-input"
          aria-label="Rename session"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          onFocus={(e) => e.target.select()}
        />
      </div>
    );
  }

  const rowClass = [
    'session-row',
    isActive ? 'active' : '',
    isOld && !isActive ? 'old' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rowClass}
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isActive && (
        <Link size={13} strokeWidth={2} className="session-active-icon" />
      )}
      <span className="session-title">{title}</span>
      {!isActive && !isConfirming && (
        <span className="session-time">{formatCompactTime(session.updatedAt)}</span>
      )}
      <div className={`session-actions ${isConfirming ? 'confirming' : ''}`}>
        {!isConfirming ? (
          <button
            type="button"
            className="session-archive"
            onClick={(e) => {
              e.stopPropagation();
              onArchiveClick();
            }}
            title="Archive"
            aria-label="Archive session"
          >
            <Archive size={12} strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            className="session-confirm-archive"
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
          >
            Confirm
          </button>
        )}
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Session/SessionRow.tsx
git commit -m "feat: add SessionRow component for sidebar redesign"
```

---

### Task 4: Rewrite SessionList

**Files:**
- Rewrite: `src/components/Session/SessionList.tsx`

- [ ] **Step 1: Rewrite SessionList.tsx**

Replace the entire file content with:

```typescript
// src/components/Session/SessionList.tsx
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';
import { stopClaude } from '../../hooks/useClaudeChat';
import { saveCurrentSession } from '../../utils/session';
import ProjectHeader from './ProjectHeader';
import SessionRow from './SessionRow';
import type { SessionData, SessionFolder } from '../../types';

interface Props {
  searchQuery?: string;
  syncingFolderIds?: string[];
  onSyncFolder: (folder: SessionFolder) => Promise<void>;
}

export default memo(function SessionList({
  searchQuery = '',
  syncingFolderIds = [],
  onSyncFolder,
}: Props) {
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

  const clearMessages = useChatStore((s) => s.clearMessages);
  const finishStreaming = useChatStore((s) => s.finishStreaming);
  const setSessionId = useChatStore((s) => s.setSessionId);
  const setClaudeSessionId = useChatStore((s) => s.setClaudeSessionId);
  const setCwd = useChatStore((s) => s.setCwd);
  const loadSession = useChatStore((s) => s.loadSession);

  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
  const [confirmingSessionId, setConfirmingSessionId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchQuery);

  // Cancel confirm on search change
  useEffect(() => {
    setConfirmingSessionId(null);
  }, [deferredSearch]);

  // Cancel confirm on click outside or Escape
  useEffect(() => {
    if (!confirmingSessionId) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.session-confirm-archive') || target?.closest('.session-archive')) return;
      setConfirmingSessionId(null);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmingSessionId(null);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [confirmingSessionId]);

  const folderSections = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return [...folders]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((folder) => {
        const folderSessions = sessions
          .filter((s) => s.folderId === folder.id)
          .sort((a, b) => b.updatedAt - a.updatedAt);

        if (!query) return { folder, sessions: folderSessions };

        const folderMatches =
          folder.name.toLowerCase().includes(query) || folder.path.toLowerCase().includes(query);
        const matchedSessions = folderMatches
          ? folderSessions
          : folderSessions.filter((s) => s.name.toLowerCase().includes(query));

        if (!folderMatches && matchedSessions.length === 0) return null;
        return { folder, sessions: matchedSessions };
      })
      .filter(Boolean) as { folder: SessionFolder; sessions: SessionData[] }[];
  }, [deferredSearch, folders, sessions]);

  const handleSelectSession = useCallback(
    (session: SessionData) => {
      if (session.id === activeSessionId) return;

      let chatState = useChatStore.getState();
      if (chatState.isStreaming) {
        stopClaude();
        finishStreaming();
        chatState = useChatStore.getState();
      }

      if (activeSessionId) {
        saveSessionMessages(activeSessionId, chatState.messages, chatState.cost, chatState.inputTokens, chatState.outputTokens, {
          model: chatState.model,
          claudeSessionId: chatState.claudeSessionId,
          cwd: chatState.cwd,
        });
      }

      const folder = getFolder(session.folderId);
      setActiveFolder(session.folderId);
      setActiveSession(session.id);
      setSessionId(session.id);
      setCwd(session.cwd || folder?.path || '');

      if (session.messages.length || session.claudeSessionId) {
        loadSession({
          messages: session.messages,
          cost: session.cost,
          inputTokens: session.inputTokens,
          outputTokens: session.outputTokens,
          claudeSessionId: session.claudeSessionId ?? null,
          model: session.model,
        });
      } else {
        clearMessages();
        setClaudeSessionId(null);
      }
    },
    [activeSessionId, clearMessages, finishStreaming, getFolder, loadSession, saveSessionMessages, setActiveFolder, setActiveSession, setClaudeSessionId, setCwd, setSessionId],
  );

  const handleToggleFolder = useCallback(
    (folder: SessionFolder) => {
      if (!deferredSearch.trim()) {
        setCollapsedFolderIds((current) => {
          const next = new Set(current);
          if (next.has(folder.id)) {
            next.delete(folder.id);
          } else {
            next.add(folder.id);
          }
          return next;
        });
      }

      if (!folder.hasSyncedClaudeHistory && !syncingFolderIds.includes(folder.id)) {
        void onSyncFolder(folder);
      }
    },
    [deferredSearch, onSyncFolder, syncingFolderIds],
  );

  const handleArchiveSession = useCallback(
    (session: SessionData) => {
      deleteSession(session.id);
      setConfirmingSessionId(null);

      if (session.id === activeSessionId) {
        const folder = getFolder(session.folderId);
        clearMessages();
        setSessionId(null);
        setClaudeSessionId(null);
        setCwd(folder?.path || '');
      }
    },
    [activeSessionId, clearMessages, deleteSession, getFolder, setClaudeSessionId, setCwd, setSessionId],
  );

  if (folders.length === 0) {
    return (
      <div className="empty-state">
        <SearchIcon size={28} strokeWidth={1.2} className="empty-state-icon" aria-hidden="true" />
        <p>No folders yet</p>
        <p>Add a workspace folder to get started</p>
      </div>
    );
  }

  if (folderSections.length === 0) {
    return (
      <div className="empty-state">
        <SearchIcon size={28} strokeWidth={1.2} className="empty-state-icon" aria-hidden="true" />
        <p>No results</p>
        <p>Try a different keyword</p>
      </div>
    );
  }

  return (
    <div className="session-list">
      {folderSections.map(({ folder, sessions: folderSessions }) => {
        const isOpen = deferredSearch.trim() ? true : !collapsedFolderIds.has(folder.id);
        const isSyncing = syncingFolderIds.includes(folder.id);

        return (
          <section key={folder.id} className="project-group">
            <ProjectHeader
              name={folder.name}
              isOpen={isOpen}
              sessionCount={folderSessions.length}
              isSyncing={isSyncing}
              onClick={() => handleToggleFolder(folder)}
            />
            <div className={`project-sessions-shell ${isOpen ? 'open' : ''}`}>
              <div className="project-sessions">
                {folderSessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    isActive={activeSessionId === session.id}
                    isConfirming={confirmingSessionId === session.id}
                    onSelect={() => handleSelectSession(session)}
                    onArchiveClick={() => setConfirmingSessionId(session.id)}
                    onConfirm={() => handleArchiveSession(session)}
                    onCancelConfirm={() => setConfirmingSessionId(null)}
                    onRename={(name) => renameSession(session.id, name)}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Session/SessionList.tsx
git commit -m "feat: rewrite SessionList with Codex-style flat layout"
```

---

## Chunk 2: CSS + Sidebar Simplification

### Task 5: Rewrite session-list.css

**Files:**
- Rewrite: `src/styles/components/session-list.css`

- [ ] **Step 1: Replace entire CSS file**

```css
/* ============================================
   Session List — Codex-style flat layout
   ============================================ */

.session-list {
  display: flex;
  flex-direction: column;
  padding: 0 var(--space-2);
}

/* ═══════════════════════════════════════
   Project Group (folder section)
   ═══════════════════════════════════════ */

.project-group + .project-group .project-header {
  margin-top: var(--space-2);
}

.project-header {
  width: 100%;
  border: none;
  background: transparent;
  padding: 10px var(--space-2) var(--space-1);
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  text-align: left;
  user-select: none;
}

.project-header:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  border-radius: var(--radius-sm);
}

.project-header-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.project-header-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  transition: color 120ms ease-out;
}

.project-header-name.open {
  color: var(--text-secondary);
}

.project-count {
  font-size: var(--text-2xs);
  color: var(--border-strong);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* ── Sync indicator ── */

.project-sync {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  flex-shrink: 0;
}

.project-sync-dot {
  width: 5px;
  height: 5px;
  border-radius: var(--radius-full);
  background: var(--accent);
  animation: syncPulse 1.2s ease-in-out infinite;
}

.project-sync-label {
  font-size: 9.5px;
  color: var(--text-muted);
}

@keyframes syncPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ── Collapse animation ── */

.project-sessions-shell {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.project-sessions-shell.open {
  grid-template-rows: 1fr;
}

.project-sessions {
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ═══════════════════════════════════════
   Session Row — flat: [title] [time]
   ═══════════════════════════════════════ */

.session-row {
  position: relative;
  display: flex;
  align-items: center;
  padding: 9px var(--space-3) 9px 28px;
  cursor: pointer;
  border-radius: 8px;
  background: transparent;
  margin: 1px 0;
  transition: background 120ms ease-out;
}

.session-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.session-row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* ── Active state ── */

.session-row.active {
  background: rgba(168, 85, 247, 0.08);
}

.session-row.active:hover {
  background: rgba(168, 85, 247, 0.12);
}

.session-active-icon {
  position: absolute;
  left: 10px;
  color: var(--accent);
  flex-shrink: 0;
}

/* ── Title ── */

.session-title {
  font-size: var(--text-base);
  font-weight: 400;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  line-height: 1.4;
  transition: color 120ms ease-out;
}

.session-row:hover .session-title {
  color: var(--text-primary);
}

.session-row.active .session-title {
  color: var(--text-primary);
  font-weight: 500;
}

.session-row.old .session-title {
  color: var(--text-muted);
}

.session-row.old:hover .session-title {
  color: var(--text-primary);
}

/* ── Time ── */

.session-time {
  font-size: var(--text-xs);
  color: var(--text-disabled);
  flex-shrink: 0;
  margin-left: var(--space-3);
  font-variant-numeric: tabular-nums;
}

/* ── Archive actions ── */

.session-actions {
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%) translateX(4px);
  display: flex;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 120ms ease-out,
    transform 120ms ease-out;
}

.session-row:hover .session-actions,
.session-actions.confirming {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(-50%) translateX(0);
}

/* Hide time when actions visible */
.session-row:hover .session-time {
  visibility: hidden;
}

.session-archive {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-disabled);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.session-archive:hover {
  background: var(--interactive-danger);
  color: var(--danger);
}

.session-confirm-archive {
  height: 24px;
  padding: 0 10px;
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger);
  font-size: var(--text-2xs);
  font-weight: 600;
  font-family: var(--font-body);
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.session-confirm-archive:hover {
  background: rgba(248, 113, 113, 0.2);
}

/* ── Rename ── */

.session-rename-input {
  font-size: var(--text-base);
  font-weight: 500;
  background: var(--bg-base);
  color: var(--text-primary);
  border: 1px solid var(--accent);
  border-radius: var(--radius-xs);
  padding: var(--space-1) var(--space-2);
  width: 100%;
  outline: none;
  font-family: var(--font-body);
  box-shadow: 0 0 0 2px var(--accent-muted);
}

/* ── Empty states ── */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10) var(--space-5);
  gap: var(--space-2);
  text-align: center;
}

.empty-state-icon {
  color: var(--text-disabled);
  opacity: 0.35;
  margin-bottom: var(--space-1);
}

.empty-state p:first-of-type {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.empty-state p:last-of-type {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/session-list.css
git commit -m "style: rewrite session-list CSS for Codex-style flat layout"
```

---

### Task 6: Simplify Sidebar.tsx

**Files:**
- Modify: `src/components/Layout/Sidebar.tsx`

- [ ] **Step 1: Simplify Sidebar — remove duplicated props and sync orchestration**

The new SessionList no longer needs `onCreateSession` or `onFocusFolder` — it handles selection internally. Sidebar only needs to pass `searchQuery`, `syncingFolderIds`, and `onSyncFolder`. Also keep the header "Sessions" + "+" button and Add Folder button.

Replace the entire file with:

```typescript
// src/components/Layout/Sidebar.tsx
import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react';
import { Search, FolderPlus, Plus, Package } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';
import { stopClaude } from '../../hooks/useClaudeChat';
import { saveCurrentSession } from '../../utils/session';
import SessionList from '../Session/SessionList';
import type { SessionFolder } from '../../types';

const SettingsPanel = lazy(() => import('../Settings/SettingsPanel'));
const ActivityStream = lazy(() => import('../Chat/ActivityStream'));

export default memo(function Sidebar() {
  const activePanel = useUIStore((s) => s.activePanel);
  const folders = useSessionStore((s) => s.folders);
  const activeFolderId = useSessionStore((s) => s.activeFolderId);
  const createFolder = useSessionStore((s) => s.createFolder);
  const createSession = useSessionStore((s) => s.createSession);
  const importClaudeSessions = useSessionStore((s) => s.importClaudeSessions);
  const markFolderSynced = useSessionStore((s) => s.markFolderSynced);

  const [search, setSearch] = useState('');
  const [syncingFolderIds, setSyncingFolderIds] = useState<string[]>([]);

  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeFolderId),
    [folders, activeFolderId],
  );

  const syncFolder = useCallback(
    async (folder: SessionFolder) => {
      if (!window.electronAPI?.projects.importClaudeHistory || !folder.path || folder.kind !== 'local') {
        markFolderSynced(folder.id);
        return;
      }
      if (syncingFolderIds.includes(folder.id)) return;

      setSyncingFolderIds((current) => [...current, folder.id]);
      try {
        const imported = await window.electronAPI.projects.importClaudeHistory(folder.path);
        importClaudeSessions(folder.id, imported);
        if (imported.length === 0) markFolderSynced(folder.id);
      } catch (error) {
        console.error('Failed to import Claude history', error);
      } finally {
        setSyncingFolderIds((current) => current.filter((id) => id !== folder.id));
      }
    },
    [importClaudeSessions, markFolderSynced, syncingFolderIds],
  );

  const handleAddFolder = useCallback(async () => {
    if (window.electronAPI?.projects.selectDirectory) {
      const selectedPath = await window.electronAPI.projects.selectDirectory();
      if (!selectedPath) return;
      const folder = createFolder(selectedPath);
      void syncFolder(folder);
      if (window.electronAPI?.projects.watchHistory && folder.path) {
        window.electronAPI.projects.watchHistory(
          folder.path,
          folder.path.replace(/[^a-zA-Z0-9]/g, '-'),
        );
      }
      return;
    }
    const nextIdx = folders.filter((f) => f.kind === 'virtual' && f.name.startsWith('Workspace')).length + 1;
    createFolder('', `Workspace ${nextIdx}`, 'virtual');
  }, [createFolder, folders, syncFolder]);

  const handleNewSession = useCallback(() => {
    if (useChatStore.getState().isStreaming) {
      stopClaude();
      useChatStore.getState().finishStreaming();
    }
    saveCurrentSession();
    useChatStore.getState().clearMessages();
    createSession();
  }, [createSession]);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        {activePanel === 'sessions' ? (
          <>
            <span className="sidebar-title">Sessions</span>
            <div className="sidebar-actions">
              <button className="sidebar-action-btn" onClick={handleNewSession} title="New Session" aria-label="New session">
                <Plus size={15} strokeWidth={2} />
              </button>
              <button className="sidebar-action-btn" onClick={handleAddFolder} title="Add Folder" aria-label="Add folder">
                <FolderPlus size={15} strokeWidth={1.8} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1 }} />
        )}
      </div>
      {activePanel === 'sessions' && (
        <div className="sidebar-search-wrapper">
          <div className="sidebar-search">
            <Search size={12} strokeWidth={2} className="sidebar-search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              aria-label="Search sessions"
            />
          </div>
        </div>
      )}
      <div className="sidebar-content">
        {activePanel === 'sessions' && (
          <SessionList
            searchQuery={search}
            syncingFolderIds={syncingFolderIds}
            onSyncFolder={syncFolder}
          />
        )}
        {activePanel === 'settings' && (
          <Suspense fallback={null}>
            <SettingsPanel />
          </Suspense>
        )}
        {activePanel === 'activity' && (
          <Suspense fallback={null}>
            <ActivityStream />
          </Suspense>
        )}
      </div>
      {activeFolder?.path && (
        <div className="sidebar-footer">
          <Package size={11} strokeWidth={1.8} />
          <span className="sidebar-footer-path">{activeFolder.path}</span>
        </div>
      )}
    </div>
  );
});
```

- [ ] **Step 2: Update sidebar.css — add sidebar-title and sidebar-search-wrapper styles**

Add to `src/styles/components/sidebar.css`, find the `.sidebar-header` block and add after the existing `.sidebar-actions` styles:

```css
.sidebar-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  flex: 1;
}

.sidebar-search-wrapper {
  padding: 0 var(--space-3) var(--space-2);
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout/Sidebar.tsx src/styles/components/sidebar.css
git commit -m "refactor: simplify Sidebar with Codex-style header layout"
```

---

### Task 7: Final build verification + visual check

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 2: Build Electron app**

Run: `npm run dist:mac`
Expected: DMG built successfully

- [ ] **Step 3: Install and launch**

```bash
osascript -e 'tell application "Codeye" to quit' 2>/dev/null
sleep 1
hdiutil attach "release/Codeye-<version>-arm64.dmg" -nobrowse -quiet
cp -R "/Volumes/Codeye <version>-arm64/Codeye.app" /Applications/
hdiutil detach "/Volumes/Codeye <version>-arm64" -quiet
open -a Codeye
```

- [ ] **Step 4: Take screenshots for visual verification**

Use Playwright to capture desktop screenshots showing:
- Sidebar with folders and sessions
- Active session state
- Hover state with archive button

- [ ] **Step 5: Commit version bump and push**

```bash
# Bump version in package.json
git add -A
git commit -m "release: v0.17.3 — sidebar redesign (Codex-style)"
git push
```
