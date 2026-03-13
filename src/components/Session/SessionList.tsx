import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';
import type { SessionData, SessionFolder } from '../../types';

interface Props {
  searchQuery?: string;
  syncingFolderIds?: string[];
  onCreateSession: (folderId?: string) => void;
  onFocusFolder: (folder: SessionFolder) => void;
  onSyncFolder: (folder: SessionFolder) => Promise<void>;
}

interface FolderSection {
  folder: SessionFolder;
  sessions: SessionData[];
}

function formatRelativeTime(timestamp: number) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SessionList({
  searchQuery = '',
  syncingFolderIds = [],
  onCreateSession,
  onFocusFolder,
  onSyncFolder,
}: Props) {
  const {
    folders,
    sessions,
    activeFolderId,
    activeSessionId,
    setActiveFolder,
    setActiveSession,
    deleteSession,
    renameSession,
    saveSessionMessages,
    getFolder,
  } = useSessionStore();
  const clearMessages = useChatStore((s) => s.clearMessages);
  const setSessionId = useChatStore((s) => s.setSessionId);
  const setClaudeSessionId = useChatStore((s) => s.setClaudeSessionId);
  const setCwd = useChatStore((s) => s.setCwd);
  const loadSession = useChatStore((s) => s.loadSession);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredSearch = useDeferredValue(searchQuery);

  useEffect(() => {
    if (!pendingDeleteId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.session-delete') || target?.closest('.session-confirm-delete')) {
        return;
      }
      setPendingDeleteId(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingDeleteId(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [pendingDeleteId]);

  const folderSections = useMemo<FolderSection[]>(() => {
    const query = deferredSearch.trim().toLowerCase();

    return [...folders]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((folder) => {
        const folderSessions = sessions
          .filter((session) => session.folderId === folder.id)
          .sort((a, b) => b.updatedAt - a.updatedAt);

        if (!query) {
          return { folder, sessions: folderSessions };
        }

        const folderMatches =
          folder.name.toLowerCase().includes(query) || folder.path.toLowerCase().includes(query);
        const matchedSessions = folderMatches
          ? folderSessions
          : folderSessions.filter((session) => session.name.toLowerCase().includes(query));

        if (!folderMatches && matchedSessions.length === 0) {
          return null;
        }

        return { folder, sessions: matchedSessions };
      })
      .filter((section): section is FolderSection => section !== null);
  }, [deferredSearch, folders, sessions]);

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameSession(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleSelectSession = (session: SessionData) => {
    if (session.id === activeSessionId) return;

    const chatState = useChatStore.getState();

    if (activeSessionId && chatState.messages.length > 0) {
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
  };

  const handleActivateFolder = async (folder: SessionFolder) => {
    const activeSession = activeSessionId
      ? sessions.find((session) => session.id === activeSessionId)
      : undefined;

    if (activeFolderId !== folder.id || activeSession?.folderId !== folder.id) {
      onFocusFolder(folder);
    } else {
      setActiveFolder(folder.id);
    }

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
      await onSyncFolder(folder);
    }
  };

  const handleDeleteConfirm = (event: React.MouseEvent, session: SessionData) => {
    event.stopPropagation();
    deleteSession(session.id);
    setPendingDeleteId(null);

    if (session.id === activeSessionId) {
      const folder = getFolder(session.folderId);
      clearMessages();
      setSessionId(null);
      setClaudeSessionId(null);
      setCwd(folder?.path || '');
    }
  };

  if (folders.length === 0) {
    return (
      <div className="empty-state">
        <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none">
          <path d="M6 14.5a3.5 3.5 0 0 1 3.5-3.5h9l3 3.5H38.5A3.5 3.5 0 0 1 42 18v16.5A3.5 3.5 0 0 1 38.5 38h-29A3.5 3.5 0 0 1 6 34.5z" stroke="currentColor" strokeWidth="2" />
          <path d="M15 24h18M24 15v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p>No folders yet</p>
        <p>Add a workspace folder to get started</p>
      </div>
    );
  }

  if (folderSections.length === 0) {
    return (
      <div className="empty-state">
        <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none">
          <circle cx="20" cy="20" r="11" stroke="currentColor" strokeWidth="2" />
          <path d="M28 28l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p>No results</p>
        <p>Try a different keyword</p>
      </div>
    );
  }

  return (
    <div className="session-list">
      {folderSections.map(({ folder, sessions: folderSessions }) => {
        const isExpanded = deferredSearch.trim() ? true : !collapsedFolderIds.has(folder.id);
        const isActiveFolder = activeFolderId === folder.id;
        const isSyncing = syncingFolderIds.includes(folder.id);

        return (
          <section
            key={folder.id}
            className={`folder-section ${isActiveFolder ? 'active' : ''}`}
          >
            <div
              role="button"
              tabIndex={0}
              className="folder-header"
              onClick={() => void handleActivateFolder(folder)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void handleActivateFolder(folder); } }}
            >
              <div className="folder-header-main">
                <span className={`folder-chevron ${isExpanded ? 'open' : ''}`} aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4 4.5L6 7L8 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="folder-name">{folder.name}</span>
                {(isSyncing || (!folder.hasSyncedClaudeHistory && folder.kind === 'local')) && (
                  <span className={`folder-sync-dot ${isSyncing ? 'syncing' : 'idle'}`} />
                )}
              </div>
              <div className="folder-header-actions">
                {folderSessions.length > 0 && (
                  <span className="folder-count">{folderSessions.length}</span>
                )}
                <button
                  type="button"
                  className="folder-new-session"
                  onClick={(event) => {
                    event.stopPropagation();
                    setCollapsedFolderIds((current) => {
                      const next = new Set(current);
                      next.delete(folder.id);
                      return next;
                    });
                    onCreateSession(folder.id);
                  }}
                  title="New session"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={`folder-session-shell ${isExpanded ? 'open' : ''}`}>
              <div className="folder-session-list">
                {folderSessions.length > 0 ? (
                  folderSessions.map((session) => {
                    const isEditing = editingId === session.id;
                    const isPendingDelete = pendingDeleteId === session.id;
                    return (
                      <div
                        key={session.id}
                        className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                        onClick={() => handleSelectSession(session)}
                      >
                        <div
                          className="session-item-content"
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            setEditingId(session.id);
                            setEditName(session.name);
                          }}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              className="session-rename-input"
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') commitRename();
                                if (event.key === 'Escape') setEditingId(null);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              autoFocus
                              onFocus={(event) => event.target.select()}
                            />
                          ) : (
                            <span className="session-name">{session.name}</span>
                          )}
                          {!isEditing && (
                            <span className="session-time">
                              {formatRelativeTime(session.updatedAt)}
                            </span>
                          )}
                        </div>
                        <div className={`session-actions ${isPendingDelete ? 'confirming' : ''}`}>
                          <button
                            className="session-delete"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPendingDeleteId((current) => (current === session.id ? null : session.id));
                            }}
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            </svg>
                          </button>
                          <button
                            className="session-confirm-delete"
                            onClick={(event) => handleDeleteConfirm(event, session)}
                            title="Confirm delete"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="folder-empty">
                    <span>No chats yet.</span>
                    <button type="button" onClick={() => onCreateSession(folder.id)}>
                      Start one
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
