import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  claude: {
    query: (params: { prompt: string; sessionId?: string; cwd?: string; mode?: string }) =>
      ipcRenderer.invoke('claude:query', params),
    stop: () => ipcRenderer.invoke('claude:stop'),
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
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
});
