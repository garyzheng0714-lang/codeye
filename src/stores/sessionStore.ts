import { create } from 'zustand';
import type {
  DisplayMessage,
  ImportedClaudeSession,
  ModelId,
  SessionData,
  SessionFolder,
} from '../types';
import { useChatStore } from './chatStore';

const DEFAULT_FOLDER_NAME = 'Quick Chats';
const SUPPORTED_MODELS = new Set<ModelId>([
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
]);

function normalizeModelId(model?: string): ModelId | undefined {
  if (!model) return undefined;
  return SUPPORTED_MODELS.has(model as ModelId) ? (model as ModelId) : undefined;
}

function now() {
  return Date.now();
}

function getFolderLabel(folderPath: string, fallbackName?: string): string {
  if (fallbackName?.trim()) return fallbackName.trim();
  if (!folderPath) return DEFAULT_FOLDER_NAME;

  const normalized = folderPath.replace(/[\\/]+$/, '');
  const segments = normalized.split(/[\\/]/).filter(Boolean);
  return segments.at(-1) || normalized;
}

function createFolderRecord(
  folderPath: string,
  fallbackName?: string,
  kind: SessionFolder['kind'] = 'local'
): SessionFolder {
  const timestamp = now();
  return {
    id: crypto.randomUUID(),
    name: getFolderLabel(folderPath, fallbackName),
    path: folderPath,
    kind,
    hasSyncedClaudeHistory: kind === 'virtual',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function ensureDefaultFolderRecord(folders: SessionFolder[]): SessionFolder {
  const existing = folders.find((folder) => folder.kind === 'virtual' && folder.name === DEFAULT_FOLDER_NAME);
  return existing ?? createFolderRecord('', DEFAULT_FOLDER_NAME, 'virtual');
}

interface SaveSessionOptions {
  model?: ModelId;
  claudeSessionId?: string | null;
  cwd?: string;
}

interface ImportResult {
  added: number;
  updated: number;
  latestSessionId: string | null;
}

interface SessionState {
  folders: SessionFolder[];
  sessions: SessionData[];
  activeFolderId: string | null;
  activeSessionId: string | null;

  createFolder: (folderPath?: string, fallbackName?: string, kind?: SessionFolder['kind']) => SessionFolder;
  setActiveFolder: (id: string | null) => void;
  markFolderSynced: (folderId: string, syncedAt?: number) => void;
  createSession: (name?: string, folderId?: string) => SessionData;
  importClaudeSessions: (folderId: string, importedSessions: ImportedClaudeSession[]) => ImportResult;
  setActiveSession: (id: string | null) => void;
  renameSession: (id: string, name: string) => void;
  deleteSession: (id: string) => void;
  saveSessionMessages: (
    id: string,
    messages: DisplayMessage[],
    cost: number,
    input: number,
    output: number,
    options?: SaveSessionOptions
  ) => void;
  forkSession: (sourceId: string, fromMessageIndex: number) => SessionData | null;
  getFolder: (id: string) => SessionFolder | undefined;
  getSession: (id: string) => SessionData | undefined;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  folders: [],
  sessions: [],
  activeFolderId: null,
  activeSessionId: null,

  createFolder: (folderPath = '', fallbackName, kind = folderPath ? 'local' : 'virtual') => {
    const normalizedPath = folderPath.trim();
    const existingFolder = get().folders.find(
      (folder) => folder.path === normalizedPath && folder.kind === kind
    );

    if (existingFolder) {
      set({ activeFolderId: existingFolder.id });
      return existingFolder;
    }

    const nextFolder = createFolderRecord(normalizedPath, fallbackName, kind);
    set((state) => ({
      folders: [nextFolder, ...state.folders],
      activeFolderId: nextFolder.id,
    }));
    return nextFolder;
  },

  setActiveFolder: (id) => set({ activeFolderId: id }),

  markFolderSynced: (folderId, syncedAt = now()) =>
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === folderId
          ? {
              ...folder,
              hasSyncedClaudeHistory: true,
              lastSyncedAt: syncedAt,
              updatedAt: Math.max(folder.updatedAt, syncedAt),
            }
          : folder
      ),
    })),

  createSession: (name, folderId) => {
    let folder =
      (folderId ? get().folders.find((candidate) => candidate.id === folderId) : undefined) ??
      (get().activeFolderId ? get().folders.find((candidate) => candidate.id === get().activeFolderId) : undefined);

    if (!folder) {
      const defaultFolder = ensureDefaultFolderRecord(get().folders);
      if (!get().folders.some((candidate) => candidate.id === defaultFolder.id)) {
        set((state) => ({
          folders: [defaultFolder, ...state.folders],
          activeFolderId: defaultFolder.id,
        }));
      }
      folder = defaultFolder;
    }

    const chatStore = useChatStore.getState();
    const timestamp = now();
    const cwd = folder.path || chatStore.cwd || '';
    const session: SessionData = {
      id: crypto.randomUUID(),
      folderId: folder.id,
      source: 'local',
      name:
        name ||
        `Session ${new Date(timestamp).toLocaleString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      cwd,
      messages: [],
      cost: 0,
      inputTokens: 0,
      outputTokens: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    set((state) => ({
      sessions: [session, ...state.sessions],
      folders: state.folders.map((candidate) =>
        candidate.id === folder.id
          ? {
              ...candidate,
              updatedAt: timestamp,
            }
          : candidate
      ),
      activeFolderId: folder.id,
      activeSessionId: session.id,
    }));

    chatStore.clearMessages();
    chatStore.setSessionId(session.id);
    chatStore.setCwd(cwd);

    return session;
  },

  importClaudeSessions: (folderId, importedSessions) => {
    if (importedSessions.length === 0) {
      return { added: 0, updated: 0, latestSessionId: null };
    }

    let added = 0;
    let updated = 0;
    let latestSessionId: string | null = null;
    let latestUpdatedAt = -Infinity;

    set((state) => {
      const sessions = [...state.sessions];

      for (const imported of importedSessions) {
        const existingIndex = sessions.findIndex(
          (session) =>
            session.folderId === folderId &&
            session.claudeSessionId === imported.claudeSessionId
        );

        const nextSession: SessionData = {
          id:
            existingIndex >= 0
              ? sessions[existingIndex].id
              : `claude-${folderId}-${imported.claudeSessionId}`,
          folderId,
          source: 'claude',
          name: imported.name,
          cwd: imported.cwd,
          claudeSessionId: imported.claudeSessionId,
          model: normalizeModelId(imported.model),
          messages: imported.messages,
          cost: existingIndex >= 0 ? sessions[existingIndex].cost : 0,
          inputTokens: imported.inputTokens,
          outputTokens: imported.outputTokens,
          createdAt: imported.createdAt,
          updatedAt: imported.updatedAt,
        };

        if (existingIndex >= 0) {
          sessions[existingIndex] = {
            ...sessions[existingIndex],
            ...nextSession,
            createdAt: Math.min(sessions[existingIndex].createdAt, imported.createdAt),
          };
          updated += 1;
        } else {
          sessions.push(nextSession);
          added += 1;
        }

        if (imported.updatedAt > latestUpdatedAt) {
          latestUpdatedAt = imported.updatedAt;
          latestSessionId = nextSession.id;
        }
      }

      return {
        sessions,
        folders: state.folders.map((folder) =>
          folder.id === folderId
            ? {
                ...folder,
                hasSyncedClaudeHistory: true,
                lastSyncedAt: now(),
                updatedAt: Math.max(folder.updatedAt, latestUpdatedAt),
              }
            : folder
        ),
      };
    });

    return { added, updated, latestSessionId };
  },

  setActiveSession: (id) =>
    set((state) => {
      const activeSession = id ? state.sessions.find((session) => session.id === id) : undefined;
      return {
        activeSessionId: id,
        activeFolderId: activeSession?.folderId ?? state.activeFolderId,
      };
    }),

  renameSession: (id, name) =>
    set((state) => {
      const timestamp = now();
      const target = state.sessions.find((session) => session.id === id);
      if (!target) return state;

      return {
        sessions: state.sessions.map((session) =>
          session.id === id ? { ...session, name, updatedAt: timestamp } : session
        ),
        folders: state.folders.map((folder) =>
          folder.id === target.folderId ? { ...folder, updatedAt: timestamp } : folder
        ),
      };
    }),

  deleteSession: (id) =>
    set((state) => {
      const target = state.sessions.find((session) => session.id === id);
      if (!target) return state;

      return {
        sessions: state.sessions.filter((session) => session.id !== id),
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        activeFolderId: target.folderId,
      };
    }),

  saveSessionMessages: (id, messages, cost, input, output, options) =>
    set((state) => {
      const timestamp = now();
      const target = state.sessions.find((session) => session.id === id);
      if (!target) return state;

      return {
        sessions: state.sessions.map((session) =>
          session.id === id
            ? {
                ...session,
                messages,
                cost,
                inputTokens: input,
                outputTokens: output,
                cwd: options?.cwd ?? session.cwd,
                claudeSessionId: options?.claudeSessionId ?? session.claudeSessionId,
                ...(options?.model ? { model: options.model } : {}),
                updatedAt: timestamp,
              }
            : session
        ),
        folders: state.folders.map((folder) =>
          folder.id === target.folderId ? { ...folder, updatedAt: timestamp } : folder
        ),
      };
    }),

  forkSession: (sourceId, fromMessageIndex) => {
    const source = get().sessions.find((s) => s.id === sourceId);
    if (!source) return null;

    const forkedMessages = source.messages.slice(0, fromMessageIndex + 1).map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      toolCalls: m.toolCalls.map((tc) => ({ ...tc, id: crypto.randomUUID() })),
    }));

    const timestamp = now();
    const forked: SessionData = {
      id: crypto.randomUUID(),
      folderId: source.folderId,
      source: 'local',
      name: `Fork: ${source.name}`,
      cwd: source.cwd,
      claudeSessionId: undefined,
      model: source.model,
      messages: forkedMessages,
      cost: 0,
      inputTokens: 0,
      outputTokens: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    set((state) => ({
      sessions: [forked, ...state.sessions],
      activeSessionId: forked.id,
    }));

    const chatStore = useChatStore.getState();
    chatStore.loadSession({
      messages: forkedMessages,
      cost: 0,
      inputTokens: 0,
      outputTokens: 0,
      model: source.model,
    });
    chatStore.setSessionId(forked.id);
    chatStore.setCwd(source.cwd);

    return forked;
  },

  getFolder: (id) => get().folders.find((folder) => folder.id === id),
  getSession: (id) => get().sessions.find((session) => session.id === id),
}));
