import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react';
import { Search, Plus, Package, RefreshCw } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useSessionStore } from '../../stores/sessionStore';
import SessionList from '../Session/SessionList';
import type { SessionFolder } from '../../types';

const FileTreePanel = lazy(() => import('../FileTree/FileTreePanel'));

export default memo(function Sidebar() {
  const activePanel = useUIStore((s) => s.activePanel);
  const folders = useSessionStore((s) => s.folders);
  const activeFolderId = useSessionStore((s) => s.activeFolderId);
  const createFolder = useSessionStore((s) => s.createFolder);
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
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
        const folder = createFolder(handle.name, handle.name, 'virtual');
        void syncFolder(folder);
        return;
      } catch {
        // user cancelled
        return;
      }
    }
    const name = prompt('输入工作区名称：');
    if (!name?.trim()) return;
    createFolder('', name.trim(), 'virtual');
  }, [createFolder, syncFolder]);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        {activePanel === 'sessions' ? (
          <>
            <span className="sidebar-title">会话</span>
            <div className="sidebar-actions">
              <button className="sidebar-action-btn" onClick={handleAddFolder} title="选择文件夹" aria-label="选择文件夹">
                <Plus size={15} strokeWidth={2} />
              </button>
            </div>
          </>
        ) : activePanel === 'files' ? (
          <>
            <span className="sidebar-title">文件</span>
            <div className="sidebar-actions">
              <button className="sidebar-action-btn" onClick={() => window.dispatchEvent(new Event('codeye:refresh-file-tree'))} title="刷新" aria-label="刷新文件树">
                <RefreshCw size={15} strokeWidth={1.8} />
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
        {activePanel === 'files' && (
          <Suspense fallback={null}>
            <FileTreePanel />
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
