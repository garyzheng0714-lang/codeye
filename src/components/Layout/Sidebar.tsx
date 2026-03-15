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
            <span className="sidebar-title">会话</span>
            <div className="sidebar-actions">
              <button className="sidebar-action-btn" onClick={handleNewSession} title="新建会话" aria-label="新建会话">
                <Plus size={15} strokeWidth={2} />
              </button>
              <button className="sidebar-action-btn" onClick={handleAddFolder} title="添加文件夹" aria-label="添加文件夹">
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
              placeholder="搜索..."
              aria-label="搜索会话"
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
