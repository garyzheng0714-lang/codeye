import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';
import {
  loadSessionSnapshot,
  persistSessionSnapshot,
  type SessionStoreSnapshot,
} from './sessionPersistence';

const PERSIST_DEBOUNCE_MS = 250;
const CHAT_SYNC_DEBOUNCE_MS = 1000;

function encodeProjectPath(folderPath: string): string {
  return folderPath.replace(/[^a-zA-Z0-9]/g, '-');
}

export function hydrateStoresFromPersistence(): void {
  const snapshot = loadSessionSnapshot();
  if (!snapshot) return;

  useSessionStore.setState({
    folders: snapshot.folders,
    sessions: snapshot.sessions,
    activeFolderId: snapshot.activeFolderId,
    activeSessionId: snapshot.activeSessionId,
  });

  const chatStore = useChatStore.getState();
  const activeSession = snapshot.activeSessionId
    ? snapshot.sessions.find((session) => session.id === snapshot.activeSessionId)
    : undefined;

  if (activeSession) {
    chatStore.setSessionId(activeSession.id);
    chatStore.setCwd(activeSession.cwd);
    chatStore.loadSession({
      messages: activeSession.messages,
      cost: activeSession.cost,
      inputTokens: activeSession.inputTokens,
      outputTokens: activeSession.outputTokens,
      claudeSessionId: activeSession.claudeSessionId ?? null,
      model: activeSession.model,
    });
    syncAllFoldersFromCli();
    return;
  }

  const activeFolder = snapshot.activeFolderId
    ? snapshot.folders.find((folder) => folder.id === snapshot.activeFolderId)
    : undefined;

  chatStore.setSessionId(null);
  chatStore.setClaudeSessionId(null);
  chatStore.setCwd(activeFolder?.path ?? '');
  syncAllFoldersFromCli();
}

/**
 * Auto-sync CLI session history for all local folders on startup.
 * If no local folder exists, auto-create one from the current cwd.
 * Runs async in background — does not block UI.
 */
function syncAllFoldersFromCli(): void {
  console.log('[sync] syncAllFoldersFromCli called, hasElectronAPI:', !!window.electronAPI, 'hasImportHistory:', !!window.electronAPI?.projects?.importClaudeHistory);
  if (!window.electronAPI?.projects.importClaudeHistory) return;

  const sessionStore = useSessionStore.getState();
  const { folders } = sessionStore;
  const localFolders = folders.filter((f) => f.kind === 'local' && f.path);
  console.log('[sync] localFolders:', localFolders.length, localFolders.map(f => f.path));

  // If no local folders, auto-discover from ~/.claude/projects/
  if (localFolders.length === 0 && window.electronAPI?.projects.list) {
    console.log('[sync] no local folders, auto-discovering from CLI...');
    window.electronAPI.projects.list().then((projects) => {
      console.log('[sync] discovered projects:', projects.length, projects.map(p => p.path));
      if (projects.length === 0) return;
      const store = useSessionStore.getState();
      let firstFolder: { id: string; path: string } | null = null;

      for (const project of projects) {
        if (!project.path || project.path === '/') continue;
        const folder = store.createFolder(project.path);
        if (!firstFolder) firstFolder = folder;
        syncFolderFromCli(folder);
        if (window.electronAPI?.projects.watchHistory) {
          window.electronAPI.projects.watchHistory(folder.path, encodeProjectPath(folder.path));
        }
      }

      if (firstFolder) {
        store.setActiveFolder(firstFolder.id);
        useChatStore.getState().setCwd(firstFolder.path);
      }
    }).catch(() => { /* silent */ });
    return;
  }

  for (const folder of localFolders) {
    syncFolderFromCli(folder);
  }

  for (const folder of localFolders) {
    if (window.electronAPI?.projects.watchHistory && folder.path) {
      window.electronAPI.projects.watchHistory(folder.path, encodeProjectPath(folder.path));
    }
  }
}

function syncFolderFromCli(folder: { id: string; path: string }): void {
  if (!window.electronAPI?.projects.importClaudeHistory) return;
  console.log('[sync] importing CLI history for folder:', folder.path);
  window.electronAPI.projects.importClaudeHistory(folder.path).then((imported) => {
    console.log('[sync] imported', imported.length, 'sessions for', folder.path);
    if (imported.length > 0) {
      const result = useSessionStore.getState().importClaudeSessions(folder.id, imported);
      console.log('[sync] import result:', result);
    }
    useSessionStore.getState().markFolderSynced(folder.id);
  }).catch((err) => {
    console.error('[sync] import failed for', folder.path, err);
  });
}

/** Force re-sync all folders from CLI. Callable from devtools or refresh button. */
export function forceSyncAllFolders(): void {
  syncAllFoldersFromCli();
}

export function startHistoryChangeListener(): () => void {
  if (!window.electronAPI?.projects.onHistoryChanged) return () => {};

  const removeListener = window.electronAPI.projects.onHistoryChanged((encodedPath) => {
    const { folders } = useSessionStore.getState();
    const matchedFolder = folders.find(
      (f) => f.kind === 'local' && f.path && encodeProjectPath(f.path) === encodedPath,
    );
    if (matchedFolder) {
      syncFolderFromCli(matchedFolder);
    }
  });

  return removeListener;
}

function syncChatToSession(): void {
  const { messages, cost, inputTokens, outputTokens, model, claudeSessionId, cwd } =
    useChatStore.getState();
  const { activeSessionId, saveSessionMessages } = useSessionStore.getState();
  if (activeSessionId) {
    saveSessionMessages(activeSessionId, messages, cost, inputTokens, outputTokens, {
      model,
      claudeSessionId,
      cwd,
    });
  }
}

export function startSessionAutoPersistence(): () => void {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let chatSyncTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = (snapshot: SessionStoreSnapshot) => {
    persistSessionSnapshot(snapshot);
  };

  const unsubSession = useSessionStore.subscribe((state) => {
    const snapshot: SessionStoreSnapshot = {
      folders: state.folders,
      sessions: state.sessions,
      activeFolderId: state.activeFolderId,
      activeSessionId: state.activeSessionId,
    };

    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      flush(snapshot);
      persistTimer = null;
    }, PERSIST_DEBOUNCE_MS);
  });

  const unsubChat = useChatStore.subscribe((state, prev) => {
    if (state.messages === prev.messages && state.cost === prev.cost) return;
    if (state.isStreaming) return;

    if (chatSyncTimer) clearTimeout(chatSyncTimer);
    chatSyncTimer = setTimeout(() => {
      syncChatToSession();
      chatSyncTimer = null;
    }, CHAT_SYNC_DEBOUNCE_MS);
  });

  return () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (chatSyncTimer) {
      clearTimeout(chatSyncTimer);
      chatSyncTimer = null;
    }
    syncChatToSession();
    const state = useSessionStore.getState();
    flush({
      folders: state.folders,
      sessions: state.sessions,
      activeFolderId: state.activeFolderId,
      activeSessionId: state.activeSessionId,
    });
    unsubSession();
    unsubChat();
  };
}
