import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from './sessionStore';
import type { ImportedClaudeSession } from '../types';

function buildImported(overrides?: Partial<ImportedClaudeSession>): ImportedClaudeSession {
  return {
    claudeSessionId: 'sess-1',
    name: 'Imported Session',
    cwd: '/tmp/project',
    model: 'claude-sonnet-4-6',
    messages: [],
    inputTokens: 10,
    outputTokens: 20,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

describe('sessionStore importClaudeSessions', () => {
  beforeEach(() => {
    useSessionStore.setState({
      folders: [],
      sessions: [],
      activeFolderId: null,
      activeSessionId: null,
    });
  });

  it('normalizes imported model to official alias', () => {
    const store = useSessionStore.getState();
    const folder = store.createFolder('/tmp/project');

    store.importClaudeSessions(folder.id, [buildImported()]);
    const imported = useSessionStore.getState().sessions[0];

    expect(imported.model).toBe('sonnet');
  });

  it('upserts existing imported session by claudeSessionId', () => {
    const store = useSessionStore.getState();
    const folder = store.createFolder('/tmp/project');

    store.importClaudeSessions(folder.id, [buildImported({ updatedAt: 100 })]);
    store.importClaudeSessions(folder.id, [buildImported({ name: 'Updated Name', updatedAt: 200 })]);

    const state = useSessionStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].name).toBe('Updated Name');
    expect(state.sessions[0].updatedAt).toBe(200);
  });
});
