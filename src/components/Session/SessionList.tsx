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

  useEffect(() => {
    setConfirmingSessionId(null);
  }, [deferredSearch]);

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
