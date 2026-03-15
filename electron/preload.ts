import { contextBridge, ipcRenderer } from 'electron';

type UpdaterStage =
  | 'idle'
  | 'unsupported'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error';

interface UpdaterState {
  stage: UpdaterStage;
  message: string;
  currentVersion: string;
  latestVersion?: string;
  percent?: number;
  transferred?: number;
  total?: number;
}

interface AttachmentPayload {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataBase64: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getCwd: () => ipcRenderer.invoke('app:get-cwd'),
  claude: {
    query: (params: { prompt: string; sessionId?: string; cwd?: string; mode?: string; model?: string; effort?: string; permissionMode?: string; attachments?: AttachmentPayload[] }) =>
      ipcRenderer.invoke('claude:query', params),
    stop: () => ipcRenderer.invoke('claude:stop', 'primary'),
    checkAuth: () => ipcRenderer.invoke('claude:check-auth'),
    onMessage: (callback: (message: unknown) => void) => {
      const handler = (_: unknown, message: unknown) => callback(message);
      ipcRenderer.on('claude:message', handler);
      return () => ipcRenderer.removeListener('claude:message', handler);
    },
    onComplete: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('claude:complete', handler);
      return () => ipcRenderer.removeListener('claude:complete', handler);
    },
    onError: (callback: (error: string) => void) => {
      const handler = (_: unknown, error: string) => callback(error);
      ipcRenderer.on('claude:error', handler);
      return () => ipcRenderer.removeListener('claude:error', handler);
    },
    queryPane: (paneId: string, params: { prompt: string; sessionId?: string; cwd?: string; mode?: string; model?: string; effort?: string; permissionMode?: string; attachments?: AttachmentPayload[] }) =>
      ipcRenderer.invoke('claude:query', { ...params, paneId }),
    stopPane: (paneId: string) => ipcRenderer.invoke('claude:stop', paneId),
    onPaneMessage: (paneId: string, callback: (message: unknown) => void) => {
      const handler = (_: unknown, message: unknown) => callback(message);
      ipcRenderer.on(`claude:message:${paneId}`, handler);
      return () => ipcRenderer.removeListener(`claude:message:${paneId}`, handler);
    },
    onPaneComplete: (paneId: string, callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on(`claude:complete:${paneId}`, handler);
      return () => ipcRenderer.removeListener(`claude:complete:${paneId}`, handler);
    },
    onPaneError: (paneId: string, callback: (error: string) => void) => {
      const handler = (_: unknown, error: string) => callback(error);
      ipcRenderer.on(`claude:error:${paneId}`, handler);
      return () => ipcRenderer.removeListener(`claude:error:${paneId}`, handler);
    },
  },
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    create: (name: string, cwd: string) => ipcRenderer.invoke('sessions:create', { name, cwd }),
    rename: (id: string, name: string) => ipcRenderer.invoke('sessions:rename', { id, name }),
    delete: (id: string) => ipcRenderer.invoke('sessions:delete', { id }),
    getMessages: (sessionId: string) => ipcRenderer.invoke('sessions:get-messages', { sessionId }),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    selectDirectory: () => ipcRenderer.invoke('projects:select-directory'),
    importClaudeHistory: (folderPath: string) => ipcRenderer.invoke('projects:import-claude-history', folderPath),
    getGitStatus: (cwd: string) => ipcRenderer.invoke('projects:get-git-status', cwd),
    watchHistory: (folderPath: string, encodedPath: string) =>
      ipcRenderer.invoke('projects:watch-history', folderPath, encodedPath),
    unwatchHistory: (encodedPath: string) =>
      ipcRenderer.invoke('projects:unwatch-history', encodedPath),
    onHistoryChanged: (callback: (encodedPath: string) => void) => {
      const handler = (_: unknown, encodedPath: string) => callback(encodedPath);
      ipcRenderer.on('projects:history-changed', handler);
      return () => ipcRenderer.removeListener('projects:history-changed', handler);
    },
  },
  secrets: {
    get: (key: string) => ipcRenderer.invoke('secret:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('secret:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('secret:delete', key),
    listKeys: () => ipcRenderer.invoke('secret:list-keys'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  updater: {
    getState: () => ipcRenderer.invoke('updater:get-state'),
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    openLatestRelease: () => ipcRenderer.invoke('updater:open-latest-release'),
    onStateChange: (callback: (state: UpdaterState) => void) => {
      const handler = (_: unknown, nextState: UpdaterState) => callback(nextState);
      ipcRenderer.on('updater:state', handler);
      return () => ipcRenderer.removeListener('updater:state', handler);
    },
  },
});
