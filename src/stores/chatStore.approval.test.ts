import { afterEach, describe, expect, it } from 'vitest';
import { useChatStore } from './chatStore';

describe('chatStore — approval state', () => {
  afterEach(() => {
    useChatStore.getState().clearMessages();
  });

  it('addPendingApproval stores approval keyed by approvalId', () => {
    const approvalId = crypto.randomUUID();
    useChatStore.getState().addPendingApproval({
      approvalId,
      toolName: 'Bash',
      args: { command: 'ls' },
      requestId: crypto.randomUUID(),
      timeoutSec: 120,
      receivedAt: Date.now(),
    });
    const pending = useChatStore.getState().pendingApprovals;
    expect(pending[approvalId]).toBeDefined();
    expect(pending[approvalId].toolName).toBe('Bash');
  });

  it('resolveApproval removes from pending', () => {
    const approvalId = crypto.randomUUID();
    useChatStore.getState().addPendingApproval({
      approvalId, toolName: 'Bash', args: {}, requestId: crypto.randomUUID(), timeoutSec: 120, receivedAt: Date.now(),
    });
    useChatStore.getState().resolveApproval(approvalId, 'allow');
    expect(useChatStore.getState().pendingApprovals[approvalId]).toBeUndefined();
  });

  it('ignores resolveApproval for unknown approvalId', () => {
    useChatStore.getState().resolveApproval(crypto.randomUUID(), 'deny');
    expect(Object.keys(useChatStore.getState().pendingApprovals)).toHaveLength(0);
  });

  it('clearMessages also clears pending approvals', () => {
    useChatStore.getState().addPendingApproval({
      approvalId: crypto.randomUUID(), toolName: 'Write', args: {}, requestId: crypto.randomUUID(), timeoutSec: 120, receivedAt: Date.now(),
    });
    useChatStore.getState().clearMessages();
    expect(Object.keys(useChatStore.getState().pendingApprovals)).toHaveLength(0);
  });
});
