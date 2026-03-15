import { describe, expect, it } from 'vitest';
import { parseStreamEvent, STREAM_EVENT_VERSION } from './streamEvent';

describe('StreamEvent parsing', () => {
  it('parses a versioned message event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'message',
      payload: {
        data: {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'hello' }],
          },
        },
      },
    });

    expect(event).not.toBeNull();
    expect(event?.version).toBe(STREAM_EVENT_VERSION);
    expect(event?.type).toBe('message');
    expect(event?.payload).toHaveProperty('data');
  });

  it('parses a versioned complete event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'complete',
      payload: {},
    });
    expect(event).not.toBeNull();
    expect(event?.type).toBe('complete');
  });

  it('parses a versioned error event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'error',
      payload: { error: 'something went wrong' },
    });
    expect(event).not.toBeNull();
    expect(event?.type).toBe('error');
    if (event?.type === 'error') {
      expect(event.payload.error).toBe('something went wrong');
    }
  });

  it('parses a versioned auth event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'auth',
      payload: { authenticated: true, method: 'cli' },
    });
    expect(event).not.toBeNull();
    expect(event?.type).toBe('auth');
    if (event?.type === 'auth') {
      expect(event.payload.authenticated).toBe(true);
    }
  });

  it('upgrades a legacy message event (no version field)', () => {
    const event = parseStreamEvent({
      type: 'message',
      data: {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'legacy' }],
        },
      },
    });

    expect(event).not.toBeNull();
    expect(event?.version).toBe(STREAM_EVENT_VERSION);
    expect(event?.type).toBe('message');
  });

  it('upgrades a legacy complete event', () => {
    const event = parseStreamEvent({ type: 'complete' });
    expect(event).not.toBeNull();
    expect(event?.type).toBe('complete');
  });

  it('upgrades a legacy error event', () => {
    const event = parseStreamEvent({ type: 'error', error: 'fail' });
    expect(event?.type).toBe('error');
    if (event?.type === 'error') {
      expect(event.payload.error).toBe('fail');
    }
  });

  it('upgrades a legacy auth event', () => {
    const event = parseStreamEvent({
      type: 'auth',
      authenticated: false,
      error: 'no CLI',
    });
    expect(event?.type).toBe('auth');
    if (event?.type === 'auth') {
      expect(event.payload.authenticated).toBe(false);
      expect(event.payload.error).toBe('no CLI');
    }
  });

  it('returns null for invalid input', () => {
    expect(parseStreamEvent(null)).toBeNull();
    expect(parseStreamEvent(42)).toBeNull();
    expect(parseStreamEvent('bad')).toBeNull();
    expect(parseStreamEvent({ type: 'unknown_event' })).toBeNull();
  });

  it('parses git_status event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'git_status',
      payload: {
        branch: 'main',
        dirty: true,
        ahead: 2,
        behind: 1,
        files: [{ path: 'src/a.ts', status: 'M' }],
      },
    });
    expect(event?.type).toBe('git_status');
  });

  it('parses git_diff_stat event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'git_diff_stat',
      payload: {
        files: [{ path: 'src/a.ts', insertions: 10, deletions: 2 }],
        summary: { filesChanged: 1, insertions: 10, deletions: 2 },
      },
    });
    expect(event?.type).toBe('git_diff_stat');
  });

  it('parses git_commit_result with correlationId and error payload', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'git_commit_result',
      correlationId: '11111111-1111-4111-8111-111111111111',
      payload: {
        operationId: '22222222-2222-4222-8222-222222222222',
        success: false,
        error: {
          code: 'LOCK_CONFLICT',
          message: 'Another operation is running',
          retryable: true,
        },
      },
    });
    expect(event?.type).toBe('git_commit_result');
  });

  it('parses git_status_request (parse-only request envelope)', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'git_status_request',
      payload: {
        requestId: '876e219c-8a58-4f33-8c48-3c0186e3780c',
        cwd: '/tmp/worktree',
        workspaceRoot: '/tmp',
        workspaceFingerprint:
          '57f3e35f9cb5d7d50f7b8950f4f3095f4f2f8bff7b11524f6c4e54dbf34ca45d',
      },
    });
    expect(event?.type).toBe('git_status_request');
  });

  it('parses tool approval request and response', () => {
    const requestEvent = parseStreamEvent({
      version: 1,
      type: 'tool_approval_request',
      payload: {
        approvalId: '48ad9f9f-315f-4991-85c2-a3d89e4479fb',
        toolName: 'bash',
        args: { cmd: 'ls -la' },
        requestId: '9b1821e5-42c4-45ec-a8f6-2100a0d2604b',
      },
    });
    const responseEvent = parseStreamEvent({
      version: 1,
      type: 'tool_approval_response',
      payload: {
        approvalId: '48ad9f9f-315f-4991-85c2-a3d89e4479fb',
        decision: 'allow',
      },
    });
    expect(requestEvent?.type).toBe('tool_approval_request');
    expect(responseEvent?.type).toBe('tool_approval_response');
  });

  it('parses preview_response and tool_progress', () => {
    const preview = parseStreamEvent({
      version: 1,
      type: 'preview_response',
      payload: {
        type: 'file',
        content: 'line 1\nline 2',
        path: 'src/index.ts',
      },
    });
    const progress = parseStreamEvent({
      version: 1,
      type: 'tool_progress',
      payload: {
        toolId: 'bash',
        requestId: 'd0f31ace-97f8-46f2-9f6f-5badbf4065d0',
        lines: ['running...', 'done'],
        finished: true,
      },
    });
    expect(preview?.type).toBe('preview_response');
    expect(progress?.type).toBe('tool_progress');
  });

  it('parses feature_flags snapshot event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'feature_flags',
      payload: {
        _schemaVersion: 1,
        flags: {
          protocolV2: true,
          gitReadStatus: true,
          gitWriteFlow: false,
          gitResultCards: false,
          toolApprovalBlocking: false,
          streamingEnhancements: false,
          commandExperience: false,
        },
        updatedAt: Date.now(),
      },
    });
    expect(event?.type).toBe('feature_flags');
  });

  it('parses tool_approval_request with timeoutSec', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'tool_approval_request',
      correlationId: '11111111-1111-4111-a111-111111111111',
      payload: {
        approvalId: '22222222-2222-4222-a222-222222222222',
        toolName: 'Bash',
        args: { command: 'rm -rf /tmp/test' },
        requestId: '33333333-3333-4333-a333-333333333333',
        timeoutSec: 120,
      },
    });
    expect(event).not.toBeNull();
    expect(event!.type).toBe('tool_approval_request');
    expect((event!.payload as any).timeoutSec).toBe(120);
  });

  it('rejects invalid new-event payloads', () => {
    const badCommitResult = parseStreamEvent({
      version: 1,
      type: 'git_commit_result',
      payload: { operationId: 'not-uuid' },
    });
    const badApproval = parseStreamEvent({
      version: 1,
      type: 'tool_approval_response',
      payload: {
        approvalId: '48ad9f9f-315f-4991-85c2-a3d89e4479fb',
        decision: 'maybe',
      },
    });
    expect(badCommitResult).toBeNull();
    expect(badApproval).toBeNull();
  });
});
