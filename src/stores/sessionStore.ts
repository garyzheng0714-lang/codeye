import { create } from 'zustand';
import type { DisplayMessage } from './chatStore';
import type { ModelId } from '../data/models';

interface SessionData {
  id: string;
  name: string;
  cwd: string;
  claudeSessionId?: string;
  model?: ModelId;
  messages: DisplayMessage[];
  cost: number;
  inputTokens: number;
  outputTokens: number;
  createdAt: number;
  updatedAt: number;
}

interface SessionState {
  sessions: SessionData[];
  activeSessionId: string | null;

  createSession: (name?: string, cwd?: string) => SessionData;
  setActiveSession: (id: string | null) => void;
  renameSession: (id: string, name: string) => void;
  deleteSession: (id: string) => void;
  saveSessionMessages: (id: string, messages: DisplayMessage[], cost: number, input: number, output: number, model?: ModelId) => void;
  getSession: (id: string) => SessionData | undefined;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  createSession: (name, cwd) => {
    const session: SessionData = {
      id: crypto.randomUUID(),
      name: name || `Session ${new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      cwd: cwd || '',
      messages: [],
      cost: 0,
      inputTokens: 0,
      outputTokens: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
    }));
    return session;
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  renameSession: (id, name) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, name, updatedAt: Date.now() } : s
      ),
    })),

  deleteSession: (id) =>
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      const activeSessionId =
        state.activeSessionId === id
          ? sessions[0]?.id ?? null
          : state.activeSessionId;
      return { sessions, activeSessionId };
    }),

  saveSessionMessages: (id, messages, cost, input, output, model) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id
          ? { ...s, messages, cost, inputTokens: input, outputTokens: output, ...(model ? { model } : {}), updatedAt: Date.now() }
          : s
      ),
    })),

  getSession: (id) => get().sessions.find((s) => s.id === id),
}));
