import { describe, it, expect } from 'vitest';
import { groupSessionsByDate } from './sessionGrouping';
import type { SessionData } from '../types';

function makeSession(updatedAt: number): SessionData {
  return {
    id: crypto.randomUUID(),
    folderId: 'folder-1',
    source: 'local',
    name: 'Test',
    cwd: '/tmp',
    messages: [],
    cost: 0,
    inputTokens: 0,
    outputTokens: 0,
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('groupSessionsByDate', () => {
  it('returns empty array for no sessions', () => {
    expect(groupSessionsByDate([])).toEqual([]);
  });

  it('groups sessions into Today', () => {
    const now = Date.now();
    const result = groupSessionsByDate([makeSession(now)]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Today');
    expect(result[0].items).toHaveLength(1);
  });

  it('groups sessions into Yesterday', () => {
    const yesterday = Date.now() - 86400000;
    const result = groupSessionsByDate([makeSession(yesterday)]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Yesterday');
  });

  it('groups sessions into multiple groups', () => {
    const now = Date.now();
    const sessions = [
      makeSession(now),
      makeSession(now - 86400000),
      makeSession(now - 86400000 * 10),
    ];
    const result = groupSessionsByDate(sessions);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('filters out empty groups', () => {
    const now = Date.now();
    const result = groupSessionsByDate([makeSession(now)]);
    for (const group of result) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });
});
