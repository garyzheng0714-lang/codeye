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
  return {
    activeSessionId: 's1',
    sessions: [
      {
        id: 's1',
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

describe('sessionPersistence', () => {
  it('persists and loads v1 document', () => {
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
        sessions: buildSnapshot().sessions,
        activeSessionId: 's1',
      })
    );

    const restored = loadSessionSnapshot(adapter);
    expect(restored).toEqual(buildSnapshot());
  });
});
