import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Search, FolderPlus, Package } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';
import { stopClaude } from '../../hooks/useClaudeChat';
import { saveCurrentSession } from '../../utils/session';
import SessionList from '../Session/SessionList';
import type { SessionFolder } from '../../types';

const SettingsPanel = lazy(() => import('../Settings/SettingsPanel'));
const ActivityStream = lazy(() => import('../Chat/ActivityStream'));

export default function Sidebar() {
  const activePanel = useUIStore((s) => s.activePanel);
  const folders = useSessionStore((s) => s.folders);
  const activeFolderId = useSessionStore((s) => s.activeFolderId);
  const createFolder = useSessionStore((s) => s.createFolder);
  const createSession = useSessionStore((s) => s.createSession);
  const setActiveFolder = useSessionStore((s) => s.setActiveFolder);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const importClaudeSessions = useSessionStore((s) => s.importClaudeSessions);
  const markFolderSynced = useSessionStore((s) => s.markFolderSynced);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const finishStreaming = useChatStore((s) => s.finishStreaming);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const setSessionId = useChatStore((s) => s.setSessionId);
  const setClaudeSessionId = useChatStore((s) => s.setClaudeSessionId);
  const setCwd = useChatStore((s) => s.setCwd);
  const [search, setSearch] = useState('');
  const [syncingFolderIds, setSyncingFolderIds] = useState<string[]>([]);

  const activeFolder = useMemo(
    () => folders.find((folder) => folder.id === activeFolderId),
    [folders, activeFolderId]
  );

  const syncFolder = useCallback(
    async (folder: SessionFolder) => {
      if (!window.electronAPI?.projects.importClaudeHistory || !folder.path || folder.kind !== 'local') {
        markFolderSynced(folder.id);
        return;
      }

      if (syncingFolderIds.includes(folder.id)) {
        return;
      }

      setSyncingFolderIds((current) => [...current, folder.id]);
      try {
        const imported = await window.electronAPI.projects.importClaudeHistory(folder.path);
        importClaudeSessions(folder.id, imported);
        if (imported.length === 0) {
          markFolderSynced(folder.id);
        }
      } catch (error) {
        console.error('Failed to import Claude history', error);
      } finally {
        setSyncingFolderIds((current) => current.filter((id) => id !== folder.id));
      }
    },
    [importClaudeSessions, markFolderSynced, syncingFolderIds]
  );

  const focusFolderWorkspace = useCallback(
    (folder: SessionFolder) => {
      if (isStreaming) {
        stopClaude();
        finishStreaming();
      }
      saveCurrentSession();
      setActiveFolder(folder.id);
      setActiveSession(null);
      clearMessages();
      setSessionId(null);
      setClaudeSessionId(null);
      setCwd(folder.path);
    },
    [clearMessages, finishStreaming, isStreaming, setActiveFolder, setActiveSession, setClaudeSessionId, setCwd, setSessionId]
  );

  const handleAddFolder = useCallback(async () => {
    if (window.electronAPI?.projects.selectDirectory) {
      const selectedPath = await window.electronAPI.projects.selectDirectory();
      if (!selectedPath) return;

      const folder = createFolder(selectedPath);
      focusFolderWorkspace(folder);
      void syncFolder(folder);
      return;
    }

    const nextWorkspaceIndex =
      folders.filter((folder) => folder.kind === 'virtual' && folder.name.startsWith('Workspace')).length + 1;
    const folder = createFolder('', `Workspace ${nextWorkspaceIndex}`, 'virtual');
    focusFolderWorkspace(folder);
  }, [createFolder, focusFolderWorkspace, folders, syncFolder]);

  const handleNewSession = useCallback(
    (folderId?: string) => {
      if (isStreaming) {
        stopClaude();
        finishStreaming();
      }
      saveCurrentSession();
      clearMessages();
      createSession(undefined, folderId);
    },
    [clearMessages, createSession, finishStreaming, isStreaming]
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-search">
          <Search size={14} strokeWidth={1.8} className="sidebar-search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            aria-label="Search sessions"
          />
        </div>
        {activePanel === 'sessions' && (
          <div className="sidebar-actions">
            <button className="sidebar-action-btn" onClick={handleAddFolder} title="Add Folder">
              <FolderPlus size={15} strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>
      <div className="sidebar-content">
        {activePanel === 'sessions' && (
          <SessionList
            searchQuery={search}
            onCreateSession={handleNewSession}
            onFocusFolder={focusFolderWorkspace}
            onSyncFolder={syncFolder}
            syncingFolderIds={syncingFolderIds}
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
}
