import { describe, expect, it, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';

describe('chatStore — git result', () => {
  beforeEach(() => {
    useChatStore.getState().clearMessages();
  });

  it('addGitResult appends a message with gitResult data', () => {
    useChatStore.getState().addGitResult({
      action: 'commit',
      operationId: crypto.randomUUID(),
      success: true,
      hash: 'abc123',
      message: 'feat: test',
    });
    const messages = useChatStore.getState().messages;
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe('assistant');
    expect(messages[0].gitResult).toBeDefined();
    expect(messages[0].gitResult!.success).toBe(true);
    expect(messages[0].gitResult!.hash).toBe('abc123');
  });

  it('addGitResult for error includes error payload', () => {
    useChatStore.getState().addGitResult({
      action: 'push',
      operationId: crypto.randomUUID(),
      success: false,
      error: { code: 'PUSH_FAILED', message: 'rejected' },
    });
    const messages = useChatStore.getState().messages;
    expect(messages[0].gitResult!.success).toBe(false);
    expect(messages[0].gitResult!.error!.code).toBe('PUSH_FAILED');
  });
});
