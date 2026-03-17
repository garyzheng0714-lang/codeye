import { describe, expect, it } from 'vitest';
import { migrateSessionsV2ToV3 } from './v2-to-v3-branch';

describe('v2-to-v3 sessions migration (branch field)', () => {
  const baseV2Doc = {
    _schemaVersion: 2 as const,
    folders: [{ id: 'f1', name: 'Test', path: '/tmp', kind: 'local' }],
    sessions: [
      { id: 's1', folderId: 'f1', name: 'Session 1', messages: [], createdAt: 1000, updatedAt: 2000 },
      { id: 's2', folderId: 'f1', name: 'Session 2', messages: [], createdAt: 1000, updatedAt: 2000, branch: 'feat/existing' },
    ],
    activeFolderId: 'f1',
    activeSessionId: 's1',
    updatedAt: 3000,
  };

  it('upgrades _schemaVersion from 2 to 3', () => {
    const result = migrateSessionsV2ToV3(baseV2Doc);
    expect(result._schemaVersion).toBe(3);
  });

  it('adds branch: null to sessions without a branch field', () => {
    const result = migrateSessionsV2ToV3(baseV2Doc);
    expect((result.sessions[0] as Record<string, unknown>).branch).toBeNull();
  });

  it('preserves existing branch values', () => {
    const result = migrateSessionsV2ToV3(baseV2Doc);
    expect((result.sessions[1] as Record<string, unknown>).branch).toBe('feat/existing');
  });

  it('preserves all other fields unchanged', () => {
    const result = migrateSessionsV2ToV3(baseV2Doc);
    expect(result.folders).toEqual(baseV2Doc.folders);
    expect(result.activeFolderId).toBe('f1');
    expect(result.activeSessionId).toBe('s1');
    expect(result.updatedAt).toBe(3000);
  });

  it('handles empty sessions array', () => {
    const emptyDoc = { ...baseV2Doc, sessions: [] };
    const result = migrateSessionsV2ToV3(emptyDoc);
    expect(result._schemaVersion).toBe(3);
    expect(result.sessions).toEqual([]);
  });
});
