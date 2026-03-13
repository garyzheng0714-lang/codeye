import { IpcMain } from 'electron';

export interface Session {
  id: string;
  name: string;
  cwd: string;
  claudeSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory store for now, will migrate to SQLite in Phase 4
let sessions: Session[] = [];

export function registerSessionHandlers(ipcMain: IpcMain) {
  ipcMain.handle('sessions:list', () => {
    return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  });

  ipcMain.handle('sessions:create', (_, { name, cwd }: { name: string; cwd: string }) => {
    const safeName = typeof name === 'string' ? name.slice(0, 200) : 'Untitled';
    const session: Session = {
      id: crypto.randomUUID(),
      name: safeName,
      cwd: typeof cwd === 'string' ? cwd : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions.push(session);
    return session;
  });

  ipcMain.handle('sessions:rename', (_, { id, name }: { id: string; name: string }) => {
    const safeName = typeof name === 'string' ? name.slice(0, 200) : '';
    if (!safeName) return undefined;
    const session = sessions.find(s => s.id === id);
    if (session) {
      session.name = safeName;
      session.updatedAt = new Date().toISOString();
    }
    return session;
  });

  ipcMain.handle('sessions:delete', (_, { id }: { id: string }) => {
    sessions = sessions.filter(s => s.id !== id);
    return true;
  });
}
