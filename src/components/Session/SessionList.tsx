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

function formatSessionTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function folderSubtitle(folder: SessionFolder, count: number) {
  if (folder.path) {
    return `${count} chats · ${folder.path}`;
  }
  return `${count} chats · Temporary workspace`;
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
  const chatStore = useChatStore();
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

    if (activeSessionId && chatStore.messages.length > 0) {
      saveSessionMessages(activeSessionId, chatStore.messages, chatStore.cost, chatStore.inputTokens, chatStore.outputTokens, {
        model: chatStore.model,
        claudeSessionId: chatStore.claudeSessionId,
        cwd: chatStore.cwd,
      });
    }

    const folder = getFolder(session.folderId);
    setActiveFolder(session.folderId);
    setActiveSession(session.id);
    chatStore.setSessionId(session.id);
    chatStore.setCwd(session.cwd || folder?.path || '');

    if (session.messages.length || session.claudeSessionId) {
      chatStore.loadSession({
        messages: session.messages,
        cost: session.cost,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        claudeSessionId: session.claudeSessionId ?? null,
        model: session.model,
      });
    } else {
      chatStore.clearMessages();
      chatStore.setClaudeSessionId(null);
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
      chatStore.clearMessages();
      chatStore.setSessionId(null);
      chatStore.setClaudeSessionId(null);
      chatStore.setCwd(folder?.path || '');
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
        <p>Add a workspace folder, then start or continue a Claude chat</p>
      </div>
    );
  }

  if (folderSections.length === 0) {
    return (
      <div className="empty-state">
        <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none">
          <rect x="7" y="10" width="34" height="28" rx="5" stroke="currentColor" strokeWidth="2" />
          <path d="M14 18h20M14 24h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p>No matching results</p>
        <p>Try another folder or session keyword</p>
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
                <span className="folder-icon-wrap">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2.75 5.25a1.75 1.75 0 0 1 1.75-1.75H7.8l1.4 1.8H12.5a1.75 1.75 0 0 1 1.75 1.75v4.7a2 2 0 0 1-2 2h-7.5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="folder-copy">
                  <span className="folder-name">{folder.name}</span>
                  <span className="folder-meta">{folderSubtitle(folder, folderSessions.length)}</span>
                </div>
              </div>
              <div className="folder-header-actions">
                {folder.kind === 'local' && (
                  <span className={`folder-sync-pill ${isSyncing ? 'syncing' : folder.hasSyncedClaudeHistory ? 'ready' : 'idle'}`}>
                    {isSyncing ? 'Syncing…' : folder.hasSyncedClaudeHistory ? 'Synced' : 'First sync'}
                  </span>
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
                  title="New session in folder"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
                <span className={`folder-chevron ${isExpanded ? 'open' : ''}`} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M4.5 5.5L7 8.5L9.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
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
                        <span className="session-item-icon">#</span>
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
                          <span className="session-meta">
                            {session.messages.length > 0 ? `${session.messages.length} msgs` : 'Ready to continue'}
                            {' · '}
                            {formatSessionTime(session.updatedAt)}
                          </span>
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
                    <span>No chats in this folder yet</span>
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
