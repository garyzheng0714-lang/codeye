import { describe, expect, it } from 'vitest';
import { groupMessagesIntoTurns } from './turnGrouping';
import type { DisplayMessage } from '../types';

function msg(role: 'user' | 'assistant', id: string): DisplayMessage {
  return { id, role, content: `${role} ${id}`, toolCalls: [], timestamp: Date.now() };
}

describe('groupMessagesIntoTurns', () => {
  it('groups user+assistant pairs into turns', () => {
    const messages = [msg('user', '1'), msg('assistant', '2'), msg('user', '3'), msg('assistant', '4')];
    const turns = groupMessagesIntoTurns(messages);
    expect(turns).toHaveLength(2);
    expect(turns[0].userMessage.id).toBe('1');
    expect(turns[0].assistantMessages).toHaveLength(1);
    expect(turns[1].userMessage.id).toBe('3');
  });

  it('handles multiple assistant messages per turn', () => {
    const messages = [msg('user', '1'), msg('assistant', '2'), msg('assistant', '3')];
    const turns = groupMessagesIntoTurns(messages);
    expect(turns).toHaveLength(1);
    expect(turns[0].assistantMessages).toHaveLength(2);
  });

  it('handles orphan assistant message', () => {
    const messages = [msg('assistant', '1')];
    const turns = groupMessagesIntoTurns(messages);
    expect(turns).toHaveLength(1);
    expect(turns[0].userMessage.content).toBe('');
  });

  it('returns empty array for no messages', () => {
    expect(groupMessagesIntoTurns([])).toHaveLength(0);
  });
});
