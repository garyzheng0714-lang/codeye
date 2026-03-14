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
    pendingMessages: [],
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

  it('marks unfinished tools as completed when streaming finishes', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    store.addToolCall({
      id: 'tool-1',
      name: 'Read',
      input: { file_path: 'README.md' },
      expanded: false,
    });

    store.finishStreaming();

    const [assistant] = useChatStore.getState().messages;
    expect(assistant.isStreaming).toBe(false);
    expect(assistant.toolCalls[0].output).toBe('');
  });

  it('updates tool output by tool id', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    store.addToolCall({
      id: 'tool-1',
      name: 'Read',
      input: { file_path: 'README.md' },
      expanded: false,
    });

    store.updateToolResult('tool-1', 'done');

    const [assistant] = useChatStore.getState().messages;
    expect(assistant.toolCalls[0].output).toBe('done');
  });

  it('enqueues and dequeues pending messages in order', () => {
    const store = useChatStore.getState();
    store.enqueueMessage({ prompt: 'first', attachments: [] });
    store.enqueueMessage({ prompt: 'second', attachments: [] });

    expect(useChatStore.getState().pendingMessages.map((item) => item.prompt)).toEqual(['first', 'second']);
    expect(store.dequeueMessage()?.prompt).toBe('first');
    expect(useChatStore.getState().pendingMessages.map((item) => item.prompt)).toEqual(['second']);
    expect(store.dequeueMessage()?.prompt).toBe('second');
    expect(store.dequeueMessage()).toBeUndefined();
  });

  it('removes queued message by index', () => {
    const store = useChatStore.getState();
    store.enqueueMessage({ prompt: 'first', attachments: [] });
    store.enqueueMessage({ prompt: 'second', attachments: [] });
    const removed = store.removeQueuedMessage(0);
    expect(removed?.prompt).toBe('first');
    expect(useChatStore.getState().pendingMessages.map((item) => item.prompt)).toEqual(['second']);
  });
});
