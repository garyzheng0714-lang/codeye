export interface SessionDocumentV2Shape {
  _schemaVersion: 2;
  folders: readonly Record<string, unknown>[];
  sessions: readonly Record<string, unknown>[];
  activeFolderId: string | null;
  activeSessionId: string | null;
  updatedAt: number;
}

export interface SessionDocumentV3Shape {
  _schemaVersion: 3;
  folders: readonly Record<string, unknown>[];
  sessions: readonly Record<string, unknown>[];
  activeFolderId: string | null;
  activeSessionId: string | null;
  updatedAt: number;
}

export function migrateSessionsV2ToV3(doc: SessionDocumentV2Shape): SessionDocumentV3Shape {
  return {
    ...doc,
    _schemaVersion: 3,
    sessions: doc.sessions.map((session) => ({
      ...session,
      branch: session.branch ?? null,
    })),
  };
}
