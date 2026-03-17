import { z } from 'zod';
import type { SessionData, SessionFolder } from '../types';
import type { StorageAdapter } from './adapter';
import { getDefaultStorageAdapter } from './adapter';
import { migrateSessionsV2ToV3 } from '../migrations/v2-to-v3-branch';

const STORAGE_KEY = 'codeye.session-store';
const STORAGE_BACKUP_KEY = 'codeye.session-store.backup';
const SCHEMA_VERSION = 3;
const DEFAULT_FOLDER_NAME = 'Quick Chats';
const MAX_PERSIST_SIZE = 4 * 1024 * 1024; // 4MB safety margin
const MAX_TOOL_OUTPUT_LENGTH = 500;
const TRIMMED_MARKER = '\n... [trimmed for storage]';

const toolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
  output: z.string().optional(),
  expanded: z.boolean(),
});

const displayMessageSchema = z.object({
  id: z.string(),
  role: z.union([z.literal('user'), z.literal('assistant')]),
  content: z.string(),
  toolCalls: z.array(toolCallSchema),
  timestamp: z.number(),
  isStreaming: z.boolean().optional(),
});

const sessionFolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  kind: z.union([z.literal('local'), z.literal('virtual')]),
  hasSyncedClaudeHistory: z.boolean(),
  lastSyncedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const sessionDataSchema = z.object({
  id: z.string(),
  folderId: z.string(),
  source: z.union([z.literal('local'), z.literal('claude')]),
  name: z.string(),
  cwd: z.string(),
  claudeSessionId: z.string().optional(),
  model: z.string().optional(),
  messages: z.array(displayMessageSchema),
  cost: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  branch: z.string().nullable().optional(),
});

const sessionDocumentV2Schema = z.object({
  _schemaVersion: z.literal(2),
  folders: z.array(sessionFolderSchema),
  sessions: z.array(sessionDataSchema),
  activeFolderId: z.string().nullable(),
  activeSessionId: z.string().nullable(),
  updatedAt: z.number(),
});

type SessionDocumentV2 = z.infer<typeof sessionDocumentV2Schema>;

const sessionDocumentV3Schema = z.object({
  _schemaVersion: z.literal(3),
  folders: z.array(sessionFolderSchema),
  sessions: z.array(sessionDataSchema),
  activeFolderId: z.string().nullable(),
  activeSessionId: z.string().nullable(),
  updatedAt: z.number(),
});

type SessionDocumentV3 = z.infer<typeof sessionDocumentV3Schema>;

const legacySessionDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  cwd: z.string(),
  claudeSessionId: z.string().optional(),
  model: z.string().optional(),
  messages: z.array(displayMessageSchema),
  cost: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const legacyDocumentSchema = z.object({
  sessions: z.array(legacySessionDataSchema),
  activeSessionId: z.string().nullable().optional(),
});

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildMigratedFolder(cwd: string, timestamp: number): SessionFolder {
  const normalized = cwd.trim();
  const name = normalized
    ? normalized.replace(/[\\/]+$/, '').split(/[\\/]/).filter(Boolean).at(-1) || normalized
    : DEFAULT_FOLDER_NAME;

  return {
    id: crypto.randomUUID(),
    name,
    path: normalized,
    kind: normalized ? 'local' : 'virtual',
    hasSyncedClaudeHistory: !normalized,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function migrateLegacyDocument(raw: unknown): SessionDocumentV2 | null {
  const legacy = legacyDocumentSchema.safeParse(raw);
  if (!legacy.success) {
    return null;
  }

  const foldersByPath = new Map<string, SessionFolder>();
  const sessions = legacy.data.sessions.map((session) => {
    const key = session.cwd.trim();
    let folder = foldersByPath.get(key);

    if (!folder) {
      const folderTimestamp = Math.min(session.createdAt, session.updatedAt);
      folder = buildMigratedFolder(key, folderTimestamp);
      foldersByPath.set(key, folder);
    }

    folder.updatedAt = Math.max(folder.updatedAt, session.updatedAt);

    return {
      ...session,
      folderId: folder.id,
      source: (session.claudeSessionId ? 'claude' : 'local') as 'claude' | 'local',
    };
  });

  const activeSession = legacy.data.activeSessionId
    ? sessions.find((session) => session.id === legacy.data.activeSessionId)
    : undefined;

  return {
    _schemaVersion: 2 as const,
    folders: Array.from(foldersByPath.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    sessions,
    activeFolderId: activeSession?.folderId ?? Array.from(foldersByPath.values())[0]?.id ?? null,
    activeSessionId: legacy.data.activeSessionId ?? null,
    updatedAt: Date.now(),
  };
}

function migrateToLatest(raw: unknown): SessionDocumentV3 | null {
  const parsedV3 = sessionDocumentV3Schema.safeParse(raw);
  if (parsedV3.success) return parsedV3.data;

  const parsedV2 = sessionDocumentV2Schema.safeParse(raw);
  if (parsedV2.success) return migrateSessionsV2ToV3(parsedV2.data) as unknown as SessionDocumentV3;

  const legacy = migrateLegacyDocument(raw);
  if (legacy) return migrateSessionsV2ToV3(legacy) as unknown as SessionDocumentV3;

  return null;
}

export interface SessionStoreSnapshot {
  folders: SessionFolder[];
  sessions: SessionData[];
  activeFolderId: string | null;
  activeSessionId: string | null;
}

export function loadSessionSnapshot(
  adapter: StorageAdapter = getDefaultStorageAdapter()
): SessionStoreSnapshot | null {
  const primaryRaw = parseJson(adapter.getItem(STORAGE_KEY));
  const primary = migrateToLatest(primaryRaw);
  if (primary) {
    return {
      folders: primary.folders as unknown as SessionFolder[],
      sessions: primary.sessions as unknown as SessionData[],
      activeFolderId: primary.activeFolderId,
      activeSessionId: primary.activeSessionId,
    };
  }

  const backupRaw = parseJson(adapter.getItem(STORAGE_BACKUP_KEY));
  const backup = migrateToLatest(backupRaw);
  if (backup) {
    return {
      folders: backup.folders as unknown as SessionFolder[],
      sessions: backup.sessions as unknown as SessionData[],
      activeFolderId: backup.activeFolderId,
      activeSessionId: backup.activeSessionId,
    };
  }

  return null;
}

function trimToolOutputs(sessions: SessionData[]): SessionData[] {
  return sessions.map((session) => ({
    ...session,
    messages: session.messages.map((msg) => ({
      ...msg,
      toolCalls: msg.toolCalls.map((tc) => {
        const { progressLines: _, ...rest } = tc;
        return {
          ...rest,
          output: rest.output && rest.output.length > MAX_TOOL_OUTPUT_LENGTH
            ? rest.output.slice(0, MAX_TOOL_OUTPUT_LENGTH) + TRIMMED_MARKER
            : rest.output,
        };
      }),
    })),
  }));
}

function stripNonActiveToolOutputs(sessions: SessionData[], activeSessionId: string | null): SessionData[] {
  return sessions.map((s) =>
    s.id === activeSessionId
      ? s
      : {
          ...s,
          messages: s.messages.map((m) => ({
            ...m,
            toolCalls: m.toolCalls.map(({ progressLines: _, output: __, ...rest }) => rest),
          })),
        }
  );
}

function dropOldestSessionMessages(sessions: SessionData[], activeSessionId: string | null): SessionData[] {
  const sorted = [...sessions].sort((a, b) => a.updatedAt - b.updatedAt);
  let dropped = 0;
  return sorted.map((s) => {
    if (s.id === activeSessionId) return s;
    if (dropped >= Math.ceil(sorted.length / 2)) return s;
    dropped++;
    return { ...s, messages: [] };
  });
}

function keepOnlyActiveSession(sessions: SessionData[], activeSessionId: string | null): SessionData[] {
  return sessions.map((s) =>
    s.id === activeSessionId ? s : { ...s, messages: [] }
  );
}

export function persistSessionSnapshot(
  snapshot: SessionStoreSnapshot,
  adapter: StorageAdapter = getDefaultStorageAdapter()
): void {
  const baseDoc = {
    _schemaVersion: SCHEMA_VERSION as typeof SCHEMA_VERSION,
    folders: snapshot.folders,
    activeFolderId: snapshot.activeFolderId,
    activeSessionId: snapshot.activeSessionId,
    updatedAt: Date.now(),
  };
  const activeId = snapshot.activeSessionId;

  const levels: Array<(s: SessionData[]) => SessionData[]> = [
    (s) => trimToolOutputs(s),
    (s) => stripNonActiveToolOutputs(s, activeId),
    (s) => dropOldestSessionMessages(s, activeId),
    (s) => keepOnlyActiveSession(s, activeId),
  ];

  let sessions = snapshot.sessions;
  let serialized = '';

  for (let level = 0; level < levels.length; level++) {
    sessions = levels[level](sessions);
    const doc: SessionDocumentV3 = { ...baseDoc, sessions };
    serialized = JSON.stringify(doc);
    if (serialized.length <= MAX_PERSIST_SIZE) break;
    if (level < levels.length - 1) {
      console.warn(`[persist] Level ${level} still exceeds 4MB (${(serialized.length / 1024 / 1024).toFixed(1)}MB), escalating`);
    }
  }

  try {
    const current = adapter.getItem(STORAGE_KEY);
    if (current) {
      adapter.setItem(STORAGE_BACKUP_KEY, current);
    }
  } catch {
    console.warn('[persist] Backup write failed (quota), proceeding with save');
  }

  try {
    adapter.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.error('[persist] Failed to save session snapshot after all degradation levels:', err);
  }
}
