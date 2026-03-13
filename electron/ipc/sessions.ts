import { IpcMain } from 'electron';

export interface Session {
  id: string;
  name: string;
  cwd: string;
  claudeSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: unknown[];
  timestamp: string;
}

// In-memory store for now, will migrate to SQLite in Phase 4
let sessions: Session[] = [];
let messages: ChatMessage[] = [];

export function registerSessionHandlers(ipcMain: IpcMain) {
  ipcMain.handle('sessions:list', () => {
    return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  });

  ipcMain.handle('sessions:create', (_, { name, cwd }: { name: string; cwd: string }) => {
    const session: Session = {
      id: crypto.randomUUID(),
      name,
      cwd,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions.push(session);
    return session;
  });

  ipcMain.handle('sessions:rename', (_, { id, name }: { id: string; name: string }) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      session.name = name;
      session.updatedAt = new Date().toISOString();
    }
    return session;
  });

  ipcMain.handle('sessions:delete', (_, { id }: { id: string }) => {
    sessions = sessions.filter(s => s.id !== id);
    messages = messages.filter(m => m.sessionId !== id);
    return true;
  });

  ipcMain.handle('sessions:get-messages', (_, { sessionId }: { sessionId: string }) => {
    return messages.filter(m => m.sessionId === sessionId);
  });
}

export function addMessage(msg: ChatMessage) {
  messages.push(msg);
  const session = sessions.find(s => s.id === msg.sessionId);
  if (session) {
    session.updatedAt = new Date().toISOString();
  }
}
