import { describe, it, expect } from 'vitest';
import type { ChatMode, ToolCallDisplay, DisplayMessage, SessionData, ModelId, ModelInfo } from './index';

describe('Type exports from types/index', () => {
  it('ChatMode accepts valid values', () => {
    const modes: ChatMode[] = ['chat', 'code', 'plan'];
    expect(modes).toHaveLength(3);
  });

  it('ModelId accepts valid values', () => {
    const ids: ModelId[] = ['opus', 'sonnet', 'haiku', 'claude-sonnet-4-6'];
    expect(ids).toHaveLength(4);
  });

  it('DisplayMessage structure is correct', () => {
    const msg: DisplayMessage = {
      id: 'test-id',
      role: 'user',
      content: 'hello',
      toolCalls: [],
      timestamp: Date.now(),
    };
    expect(msg.role).toBe('user');
    expect(msg.toolCalls).toEqual([]);
  });

  it('ToolCallDisplay structure is correct', () => {
    const tool: ToolCallDisplay = {
      id: 'tool-1',
      name: 'Read',
      input: { file_path: '/test' },
      expanded: false,
    };
    expect(tool.name).toBe('Read');
    expect(tool.expanded).toBe(false);
  });

  it('SessionData structure is correct', () => {
    const session: SessionData = {
      id: 'sess-1',
      folderId: 'folder-1',
      source: 'local',
      name: 'Test Session',
      cwd: '/tmp',
      messages: [],
      cost: 0,
      inputTokens: 0,
      outputTokens: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(session.id).toBe('sess-1');
  });

  it('ModelInfo structure is correct', () => {
    const info: ModelInfo = {
      id: 'sonnet',
      cliAlias: 'sonnet',
      label: 'Sonnet (Latest)',
      shortLabel: 'Sonnet',
      description: 'Best for coding',
      tier: 'standard',
      supportsEffort: true,
    };
    expect(info.tier).toBe('standard');
  });
});
