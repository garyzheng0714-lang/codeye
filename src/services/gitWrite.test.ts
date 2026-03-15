import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildGitWritePayload,
  handleGitWriteResult,
  clearPendingForTests,
  type GitWriteCompletedResult,
} from './gitWrite';

vi.mock('./websocket', () => ({
  sendMessage: vi.fn(),
  subscribeWsMessages: vi.fn(() => () => {}),
  getOrCreateWs: vi.fn(),
}));

afterEach(() => {
  clearPendingForTests();
});

describe('gitWrite service', () => {
  describe('buildGitWritePayload', () => {
    it('builds commit request with correct type and payload', () => {
      const msg = buildGitWritePayload({
        action: 'commit',
        cwd: '/tmp/repo',
        operationId: '11111111-1111-1111-1111-111111111111',
        correlationId: '22222222-2222-2222-2222-222222222222',
        requestId: '33333333-3333-3333-3333-333333333333',
        workspaceFingerprint: 'a'.repeat(64),
        message: 'fix: something',
      });

      expect(msg.version).toBe(1);
      expect(msg.type).toBe('git_commit_request');
      expect(msg.correlationId).toBe('22222222-2222-2222-2222-222222222222');
      expect(msg.payload.operationId).toBe('11111111-1111-1111-1111-111111111111');
      expect(msg.payload.message).toBe('fix: something');
      expect(msg.payload.cwd).toBe('/tmp/repo');
      expect(msg.payload.workspaceRoot).toBe('/tmp/repo');
    });

    it('builds push request with remote and branch', () => {
      const msg = buildGitWritePayload({
        action: 'push',
        cwd: '/tmp/repo',
        operationId: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
        requestId: crypto.randomUUID(),
        workspaceFingerprint: 'b'.repeat(64),
        remote: 'upstream',
        branch: 'feat/x',
      });

      expect(msg.type).toBe('git_push_request');
      expect(msg.payload.remote).toBe('upstream');
      expect(msg.payload.branch).toBe('feat/x');
    });

    it('builds pr request with title and body', () => {
      const msg = buildGitWritePayload({
        action: 'pr',
        cwd: '/tmp/repo',
        operationId: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
        requestId: crypto.randomUUID(),
        workspaceFingerprint: 'c'.repeat(64),
        title: 'feat: new feature',
        body: 'Description here',
        base: 'main',
      });

      expect(msg.type).toBe('git_pr_request');
      expect(msg.payload.title).toBe('feat: new feature');
      expect(msg.payload.body).toBe('Description here');
      expect(msg.payload.base).toBe('main');
    });

    it('normalizes trailing slashes from cwd', () => {
      const msg = buildGitWritePayload({
        action: 'commit',
        cwd: '/tmp/repo/',
        operationId: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
        requestId: crypto.randomUUID(),
        workspaceFingerprint: 'd'.repeat(64),
        message: 'test',
      });

      expect(msg.payload.cwd).toBe('/tmp/repo');
    });
  });

  describe('handleGitWriteResult', () => {
    it('returns null for unknown correlationId', () => {
      const result = handleGitWriteResult(
        crypto.randomUUID(),
        'commit',
        { operationId: crypto.randomUUID(), success: true }
      );
      expect(result).toBeNull();
    });

    it('processes result and invokes callback when pending op exists', async () => {
      const { sendGitWriteRequest } = await import('./gitWrite');
      let captured: GitWriteCompletedResult | null = null;

      const op = await sendGitWriteRequest({
        action: 'commit',
        cwd: '/tmp/repo',
        message: 'test',
        onResult: (r) => { captured = r; },
      });

      const result = handleGitWriteResult(
        op.correlationId,
        'commit',
        {
          operationId: op.operationId,
          success: true,
          hash: 'abc123',
          message: 'test',
        }
      );

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.hash).toBe('abc123');
      expect(result!.action).toBe('commit');
      expect(captured).not.toBeNull();
      expect(captured!.hash).toBe('abc123');
    });

    it('cleans up pending op after processing', async () => {
      const { sendGitWriteRequest, getPendingOperation } = await import('./gitWrite');

      const op = await sendGitWriteRequest({
        action: 'push',
        cwd: '/tmp/repo',
      });

      expect(getPendingOperation(op.correlationId)).toBeDefined();

      handleGitWriteResult(op.correlationId, 'push', {
        operationId: op.operationId,
        success: true,
      });

      expect(getPendingOperation(op.correlationId)).toBeUndefined();
    });

    it('preserves error payload in result', async () => {
      const { sendGitWriteRequest } = await import('./gitWrite');

      const op = await sendGitWriteRequest({
        action: 'commit',
        cwd: '/tmp/repo',
        message: 'test',
      });

      const result = handleGitWriteResult(op.correlationId, 'commit', {
        operationId: op.operationId,
        success: false,
        error: { code: 'LOCK_CONFLICT', message: 'busy', retryable: true },
      });

      expect(result!.success).toBe(false);
      expect(result!.error?.code).toBe('LOCK_CONFLICT');
      expect(result!.error?.retryable).toBe(true);
    });
  });
});
