import { useCallback, useMemo, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';
import { saveCurrentSession } from '../../utils/session';
import SessionList from '../Session/SessionList';
import SettingsPanel from '../Settings/SettingsPanel';
import ActivityStream from '../Chat/ActivityStream';
import type { SessionFolder } from '../../types';

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
      saveCurrentSession();
      setActiveFolder(folder.id);
      setActiveSession(null);
      clearMessages();
      setSessionId(null);
      setClaudeSessionId(null);
      setCwd(folder.path);
    },
    [clearMessages, setActiveFolder, setActiveSession, setClaudeSessionId, setCwd, setSessionId]
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
      saveCurrentSession();
      clearMessages();
      createSession(undefined, folderId);
    },
    [clearMessages, createSession]
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-search">
          <svg className="sidebar-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search folders or sessions..."
            aria-label="Search sessions"
          />
        </div>
        {activePanel === 'sessions' && (
          <div className="sidebar-actions">
            <button className="sidebar-action-btn" onClick={handleAddFolder} title="Add Folder">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2.5 5.5h3l1.4-1.8H13a1 1 0 0 1 1 1V11a2 2 0 0 1-2 2H4A2 2 0 0 1 2 11V6.5a1 1 0 0 1 .5-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M8 5.8v4.4M5.8 8h4.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
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
        {activePanel === 'settings' && <SettingsPanel />}
        {activePanel === 'activity' && <ActivityStream />}
      </div>
      {activeFolder?.path && (
        <div className="sidebar-footer">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 3.5L6 1l4.5 2.5v5L6 11l-4.5-2.5v-5z" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span className="sidebar-footer-path">{activeFolder.path}</span>
        </div>
      )}
    </div>
  );
}
