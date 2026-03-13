import { describe, expect, it } from 'vitest';
import {
  loadSessionSnapshot,
  persistSessionSnapshot,
  type SessionStoreSnapshot,
} from './sessionPersistence';
import type { StorageAdapter } from './adapter';

class TestStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function buildSnapshot(): SessionStoreSnapshot {
  const folderId = 'f1';
  return {
    activeFolderId: folderId,
    activeSessionId: 's1',
    folders: [
      {
        id: folderId,
        name: 'tmp',
        path: '/tmp',
        kind: 'local',
        hasSyncedClaudeHistory: false,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    sessions: [
      {
        id: 's1',
        folderId,
        source: 'local',
        name: 'Session 1',
        cwd: '/tmp',
        messages: [],
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
}

function stripLegacyFields(snapshot: SessionStoreSnapshot) {
  return snapshot.sessions.map((session) => ({
    id: session.id,
    name: session.name,
    cwd: session.cwd,
    claudeSessionId: session.claudeSessionId,
    model: session.model,
    messages: session.messages,
    cost: session.cost,
    inputTokens: session.inputTokens,
    outputTokens: session.outputTokens,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }));
}

describe('sessionPersistence', () => {
  it('persists and loads v2 document', () => {
    const adapter = new TestStorageAdapter();
    const snapshot = buildSnapshot();

    persistSessionSnapshot(snapshot, adapter);
    const restored = loadSessionSnapshot(adapter);

    expect(restored).toEqual(snapshot);
  });

  it('migrates legacy document without schema version', () => {
    const adapter = new TestStorageAdapter();
    adapter.setItem(
      'codeye.session-store',
      JSON.stringify({
        sessions: stripLegacyFields(buildSnapshot()),
        activeSessionId: 's1',
      })
    );

    const restored = loadSessionSnapshot(adapter);
    expect(restored?.activeSessionId).toBe('s1');
    expect(restored?.sessions).toHaveLength(1);
    expect(restored?.sessions[0]).toMatchObject({
      id: 's1',
      folderId: expect.any(String),
      source: 'local',
      cwd: '/tmp',
    });
    expect(restored?.folders).toHaveLength(1);
    expect(restored?.activeFolderId).toBe(restored?.sessions[0].folderId);
  });
});
