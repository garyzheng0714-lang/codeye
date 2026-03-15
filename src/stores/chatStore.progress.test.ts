import { describe, expect, it, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';

describe('chatStore — tool progress', () => {
  beforeEach(() => { useChatStore.getState().clearMessages(); });

  it('updateToolProgress appends lines to matching tool call', () => {
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().addToolCall({ id: 'tool-1', name: 'Bash', input: { command: 'npm test' }, expanded: false });
    useChatStore.getState().updateToolProgress('tool-1', ['Running tests...', '5 passed']);
    const tool = useChatStore.getState().messages[0].toolCalls[0];
    expect(tool.progressLines).toEqual(['Running tests...', '5 passed']);
  });

  it('appends to existing lines', () => {
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().addToolCall({ id: 'tool-1', name: 'Bash', input: {}, expanded: false });
    useChatStore.getState().updateToolProgress('tool-1', ['line 1']);
    useChatStore.getState().updateToolProgress('tool-1', ['line 2']);
    const tool = useChatStore.getState().messages[0].toolCalls[0];
    expect(tool.progressLines).toEqual(['line 1', 'line 2']);
  });

  it('no-op for unknown toolId', () => {
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().updateToolProgress('nonexistent', ['line']);
  });
});
