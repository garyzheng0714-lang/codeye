import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStore } from './chatStore';

function resetChatStore() {
  useChatStore.setState({
    messages: [],
    isStreaming: false,
    activeStreamId: null,
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

describe('activeStreamId isolation', () => {
  beforeEach(() => {
    resetChatStore();
  });

  it('should reject content from a stale stream after a new stream starts', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    const firstStreamId = useChatStore.getState().activeStreamId;
    expect(firstStreamId).toBeTruthy();

    store.appendAssistantContent('hello', firstStreamId!);
    expect(useChatStore.getState().messages[0].content).toBe('hello');

    store.finishStreaming();
    store.addUserMessage('next');
    store.startAssistantMessage();
    const secondStreamId = useChatStore.getState().activeStreamId;
    expect(secondStreamId).not.toBe(firstStreamId);

    // Late chunk from first stream -- must be rejected
    store.appendAssistantContent(' late', firstStreamId!);
    const msgs = useChatStore.getState().messages;
    const lastAssistant = msgs[msgs.length - 1];
    expect(lastAssistant.content).toBe('');
  });

  it('should reject content after clearMessages resets activeStreamId', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    const streamId = useChatStore.getState().activeStreamId;

    store.clearMessages();
    store.appendAssistantContent('stale', streamId!);
    expect(useChatStore.getState().messages.length).toBe(0);
  });

  it('should accept content with matching streamId even after finishStreaming', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    const streamId = useChatStore.getState().activeStreamId!;

    store.appendAssistantContent('before', streamId);
    store.finishStreaming();
    // Same streamId -- should still be accepted (grace for late delivery)
    store.appendAssistantContent(' after', streamId);

    const msgs = useChatStore.getState().messages;
    expect(msgs[0].content).toBe('before after');
  });

  it('should reject tool calls from a stale stream', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    const firstStreamId = useChatStore.getState().activeStreamId!;

    store.finishStreaming();
    store.addUserMessage('next');
    store.startAssistantMessage();

    // Late tool call from first stream
    store.addToolCall(
      { id: 'tool-stale', name: 'Read', input: {}, expanded: false },
      firstStreamId,
    );
    const msgs = useChatStore.getState().messages;
    const lastAssistant = msgs[msgs.length - 1];
    expect(lastAssistant.toolCalls).toHaveLength(0);
  });

  it('should reject tool results from a stale stream', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    const firstStreamId = useChatStore.getState().activeStreamId!;
    store.addToolCall(
      { id: 'tool-1', name: 'Read', input: {}, expanded: false },
      firstStreamId,
    );

    store.finishStreaming();
    store.addUserMessage('next');
    store.startAssistantMessage();
    const secondStreamId = useChatStore.getState().activeStreamId!;

    // Late tool result targeting old stream
    store.updateToolResult('tool-1', 'stale output', firstStreamId);
    // Tool in first assistant message should remain unchanged (finishStreaming fills undefined → '')
    const firstAssistant = useChatStore.getState().messages[0];
    expect(firstAssistant.toolCalls[0].output).toBe('');

    // Tool result without streamId should still work (backward compat)
    store.updateToolResult('tool-1', 'valid output');
    const updatedFirst = useChatStore.getState().messages[0];
    expect(updatedFirst.toolCalls[0].output).toBe('valid output');
  });

  it('should generate a new activeStreamId on each startAssistantMessage', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    const id1 = useChatStore.getState().activeStreamId;
    store.finishStreaming();

    store.addUserMessage('q');
    store.startAssistantMessage();
    const id2 = useChatStore.getState().activeStreamId;

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('should reset activeStreamId on loadSession', () => {
    const store = useChatStore.getState();
    store.startAssistantMessage();
    expect(useChatStore.getState().activeStreamId).toBeTruthy();

    store.loadSession({
      messages: [],
      cost: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(useChatStore.getState().activeStreamId).toBeNull();
  });
});
