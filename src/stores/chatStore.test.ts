import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStore } from './chatStore';

function resetChatStore() {
  useChatStore.setState({
    messages: [],
    isStreaming: false,
    mode: 'code',
    model: 'sonnet',
    effort: 'high',
    cwd: '',
    sessionId: null,
    claudeSessionId: null,
    cost: 0,
    inputTokens: 0,
    outputTokens: 0,
  });
}

describe('chatStore streaming guards', () => {
  beforeEach(() => {
    resetChatStore();
  });

  it('ignores assistant content when stream is inactive', () => {
    useChatStore.getState().appendAssistantContent('late chunk');
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it('accepts assistant content during active stream', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    store.appendAssistantContent('hello');

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('assistant');
    expect(messages[0].content).toBe('hello');
  });

  it('ignores tool calls when stream is inactive', () => {
    useChatStore.getState().addToolCall({
      id: 'tool-1',
      name: 'Read',
      input: { file_path: 'README.md' },
      expanded: false,
    });
    expect(useChatStore.getState().messages).toHaveLength(0);
  });
});
