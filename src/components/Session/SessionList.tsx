import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronRight, Plus, X, FolderPlus, Search as SearchIcon, Pencil, Trash2 } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';
import { stopClaude } from '../../hooks/useClaudeChat';
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

interface ContextMenuState {
  sessionId: string;
  x: number;
  y: number;
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

function formatCost(cost: number): string {
  if (cost <= 0) return '';
  return `$${cost.toFixed(cost < 0.01 ? 4 : 2)}`;
}

function getModelShort(model?: string): string {
  if (!model) return '';
  return model.replace('claude-', '').split('-')[0];
}

export default memo(function SessionList({
  searchQuery = '',
  syncingFolderIds = [],
  onCreateSession,
  onFocusFolder,
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
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
      if (event.key === 'Escape') setPendingDeleteId(null);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [pendingDeleteId]);

  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.session-context-menu')) {
        setContextMenu(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

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

  const handleDeleteSession = (session: SessionData) => {
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

  const handleDeleteConfirm = (event: React.MouseEvent, session: SessionData) => {
    event.stopPropagation();
    handleDeleteSession(session);
  };

  const handleContextMenu = (e: React.MouseEvent, session: SessionData) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 176);
    const y = Math.min(e.clientY, window.innerHeight - 88);
    setContextMenu({ sessionId: session.id, x, y });
  };

  const contextMenuSession = contextMenu
    ? sessions.find((s) => s.id === contextMenu.sessionId)
    : null;

  if (folders.length === 0) {
    return (
      <div className="empty-state">
        <FolderPlus size={28} strokeWidth={1.2} className="empty-state-icon" aria-hidden="true" />
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
    <>
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
                aria-expanded={isExpanded}
                onClick={() => void handleActivateFolder(folder)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleActivateFolder(folder);
                  }
                }}
              >
                <span className={`folder-chevron ${isExpanded ? 'open' : ''}`} aria-hidden="true">
                  <ChevronRight size={12} strokeWidth={2.5} />
                </span>
                <span className="folder-name">{folder.name}</span>
                {(isSyncing || (!folder.hasSyncedClaudeHistory && folder.kind === 'local')) && (
                  <span className={`folder-sync-dot ${isSyncing ? 'syncing' : 'idle'}`} />
                )}
                <div className="folder-header-actions">
                  <span className="folder-count">{folderSessions.length}</span>
                  <button
                    type="button"
                    className="folder-new-session"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsedFolderIds((current) => {
                        const next = new Set(current);
                        next.delete(folder.id);
                        return next;
                      });
                      onCreateSession(folder.id);
                    }}
                    title="New session"
                    aria-label="New session"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div className={`folder-session-shell ${isExpanded ? 'open' : ''}`}>
                <div className="folder-session-list">
                  {folderSessions.length > 0 ? (
                    folderSessions.map((session, index) => {
                      const isEditing = editingId === session.id;
                      const isActive = activeSessionId === session.id;
                      const title = getSessionTitle(session);
                      const cost = formatCost(session.cost);
                      const msgCount = session.messages.length;
                      const modelShort = getModelShort(session.model);

                      const subtitleParts: string[] = [];
                      if (modelShort) subtitleParts.push(modelShort);
                      if (msgCount > 0) subtitleParts.push(`${msgCount} msgs`);
                      if (cost) subtitleParts.push(cost);
                      subtitleParts.push(formatRelativeTime(session.updatedAt));

                      return (
                        <div
                          key={session.id}
                          className={`session-row ${isActive ? 'active' : ''}`}
                          style={{ '--session-idx': index } as React.CSSProperties}
                          role="button"
                          tabIndex={0}
                          aria-current={isActive ? 'true' : undefined}
                          onClick={() => handleSelectSession(session)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectSession(session); } }}
                          onContextMenu={(e) => handleContextMenu(e, session)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingId(session.id);
                            setEditName(session.name);
                          }}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              className="session-rename-input"
                              aria-label="Rename session"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename();
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              onFocus={(e) => e.target.select()}
                            />
                          ) : (
                            <>
                              <span className="session-dot" aria-hidden="true" />
                              <div className="session-body">
                                <span className="session-title">{title}</span>
                                <span className="session-subtitle">{subtitleParts.join(' · ')}</span>
                              </div>
                              <div className={`session-actions ${pendingDeleteId === session.id ? 'confirming' : ''}`}>
                                <button
                                  type="button"
                                  className="session-delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPendingDeleteId((current) => (current === session.id ? null : session.id));
                                  }}
                                  title="Delete session"
                                  aria-label="Delete session"
                                >
                                  <X size={11} strokeWidth={2.5} />
                                </button>
                                <button
                                  type="button"
                                  className="session-confirm-delete"
                                  onClick={(e) => handleDeleteConfirm(e, session)}
                                  title="Confirm delete"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
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

      {contextMenu && contextMenuSession && (
        <div
          className="session-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          aria-label="Session actions"
        >
          <button
            className="context-menu-item"
            role="menuitem"
            onClick={() => {
              setEditingId(contextMenu.sessionId);
              setEditName(contextMenuSession.name);
              setContextMenu(null);
            }}
          >
            <Pencil size={13} strokeWidth={1.8} />
            Rename
          </button>
          <div className="context-menu-divider" />
          <button
            className="context-menu-item danger"
            role="menuitem"
            onClick={() => {
              handleDeleteSession(contextMenuSession);
              setContextMenu(null);
            }}
          >
            <Trash2 size={13} strokeWidth={1.8} />
            Delete
          </button>
        </div>
      )}
    </>
  );
});
