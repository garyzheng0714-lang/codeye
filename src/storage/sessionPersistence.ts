import { z } from 'zod';
import type { SessionData } from '../types';
import type { StorageAdapter } from './adapter';
import { getDefaultStorageAdapter } from './adapter';

const STORAGE_KEY = 'codeye.session-store';
const STORAGE_BACKUP_KEY = 'codeye.session-store.backup';
const SCHEMA_VERSION = 1;

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

const sessionDataSchema = z.object({
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

const sessionDocumentV1Schema = z.object({
  _schemaVersion: z.literal(1),
  sessions: z.array(sessionDataSchema),
  activeSessionId: z.string().nullable(),
  updatedAt: z.number(),
});

type SessionDocumentV1 = z.infer<typeof sessionDocumentV1Schema>;

const legacyDocumentSchema = z.object({
  sessions: z.array(sessionDataSchema),
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

function migrateToLatest(raw: unknown): SessionDocumentV1 | null {
  const parsedV1 = sessionDocumentV1Schema.safeParse(raw);
  if (parsedV1.success) {
    return parsedV1.data;
  }

  const parsedLegacy = legacyDocumentSchema.safeParse(raw);
  if (parsedLegacy.success) {
    return {
      _schemaVersion: SCHEMA_VERSION,
      sessions: parsedLegacy.data.sessions,
      activeSessionId: parsedLegacy.data.activeSessionId ?? null,
      updatedAt: Date.now(),
    };
  }

  return null;
}

export interface SessionStoreSnapshot {
  sessions: SessionData[];
  activeSessionId: string | null;
}

export function loadSessionSnapshot(adapter: StorageAdapter = getDefaultStorageAdapter()): SessionStoreSnapshot | null {
  const primaryRaw = parseJson(adapter.getItem(STORAGE_KEY));
  const primary = migrateToLatest(primaryRaw);
  if (primary) {
    return { sessions: primary.sessions as SessionData[], activeSessionId: primary.activeSessionId };
  }

  const backupRaw = parseJson(adapter.getItem(STORAGE_BACKUP_KEY));
  const backup = migrateToLatest(backupRaw);
  if (backup) {
    return { sessions: backup.sessions as SessionData[], activeSessionId: backup.activeSessionId };
  }

  return null;
}

export function persistSessionSnapshot(
  snapshot: SessionStoreSnapshot,
  adapter: StorageAdapter = getDefaultStorageAdapter()
): void {
  const nextDocument: SessionDocumentV1 = {
    _schemaVersion: SCHEMA_VERSION,
    sessions: snapshot.sessions,
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

export function clearPersistedSessions(adapter: StorageAdapter = getDefaultStorageAdapter()): void {
  adapter.removeItem(STORAGE_KEY);
  adapter.removeItem(STORAGE_BACKUP_KEY);
}
