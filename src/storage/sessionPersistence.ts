import { z } from 'zod';
import type { SessionData, SessionFolder } from '../types';
import type { StorageAdapter } from './adapter';
import { getDefaultStorageAdapter } from './adapter';

const STORAGE_KEY = 'codeye.session-store';
const STORAGE_BACKUP_KEY = 'codeye.session-store.backup';
const SCHEMA_VERSION = 2;
const DEFAULT_FOLDER_NAME = 'Quick Chats';

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
    _schemaVersion: SCHEMA_VERSION,
    folders: Array.from(foldersByPath.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    sessions,
    activeFolderId: activeSession?.folderId ?? Array.from(foldersByPath.values())[0]?.id ?? null,
    activeSessionId: legacy.data.activeSessionId ?? null,
    updatedAt: Date.now(),
  };
}

function migrateToLatest(raw: unknown): SessionDocumentV2 | null {
  const parsedV2 = sessionDocumentV2Schema.safeParse(raw);
  if (parsedV2.success) {
    return parsedV2.data;
  }

  return migrateLegacyDocument(raw);
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
      folders: primary.folders as SessionFolder[],
      sessions: primary.sessions as SessionData[],
      activeFolderId: primary.activeFolderId,
      activeSessionId: primary.activeSessionId,
    };
  }

  const backupRaw = parseJson(adapter.getItem(STORAGE_BACKUP_KEY));
  const backup = migrateToLatest(backupRaw);
  if (backup) {
    return {
      folders: backup.folders as SessionFolder[],
      sessions: backup.sessions as SessionData[],
      activeFolderId: backup.activeFolderId,
      activeSessionId: backup.activeSessionId,
    };
  }

  return null;
}

export function persistSessionSnapshot(
  snapshot: SessionStoreSnapshot,
  adapter: StorageAdapter = getDefaultStorageAdapter()
): void {
  const nextDocument: SessionDocumentV2 = {
    _schemaVersion: SCHEMA_VERSION,
    folders: snapshot.folders,
    sessions: snapshot.sessions,
    activeFolderId: snapshot.activeFolderId,
    activeSessionId: snapshot.activeSessionId,
    updatedAt: Date.now(),
  };

  const serialized = JSON.stringify(nextDocument);
  const current = adapter.getItem(STORAGE_KEY);

  if (current) {
    adapter.setItem(STORAGE_BACKUP_KEY, current);
  }

  adapter.setItem(STORAGE_KEY, serialized);
}
