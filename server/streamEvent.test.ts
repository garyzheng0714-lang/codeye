import { describe, expect, it } from 'vitest';
import { wrapEvent, type ServerStreamEventType } from './streamEvent';

const serverEventTypes: ServerStreamEventType[] = [
  'message',
  'complete',
  'error',
  'auth',
  'feature_flags',
  'git_status',
  'git_diff_stat',
  'git_commit_result',
  'git_push_result',
  'git_pr_result',
  'git_operation_status',
  'tool_approval_request',
  'tool_approval_response',
  'preview_response',
  'tool_progress',
];

describe('server wrapEvent', () => {
  it('serializes all supported event types', () => {
    for (const type of serverEventTypes) {
      const serialized = wrapEvent(type, { ok: true });
      const parsed = JSON.parse(serialized) as Record<string, unknown>;
      expect(parsed.version).toBe(1);
      expect(parsed.type).toBe(type);
      expect(parsed.payload).toEqual({ ok: true });
      expect(parsed).not.toHaveProperty('correlationId');
    }
  });

  it('includes correlationId when provided', () => {
    const correlationId = '11111111-1111-1111-1111-111111111111';
    const serialized = wrapEvent('git_commit_result', { ok: true }, correlationId);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    expect(parsed.correlationId).toBe(correlationId);
  });
});
