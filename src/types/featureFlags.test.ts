import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCAL_FLAGS,
  DEFAULT_SERVER_FLAGS,
  parseConnectionContext,
  parseErrorPayload,
  parseFeatureFlagDocument,
} from './featureFlags';

describe('featureFlags contracts', () => {
  it('accepts valid v1 server feature flag document', () => {
    const parsed = parseFeatureFlagDocument({
      _schemaVersion: 1,
      flags: DEFAULT_SERVER_FLAGS,
      updatedAt: Date.now(),
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.flags.gitReadStatus).toBe(true);
  });

  it('accepts valid v1 local feature flag document', () => {
    const parsed = parseFeatureFlagDocument({
      _schemaVersion: 1,
      flags: DEFAULT_LOCAL_FLAGS,
      updatedAt: Date.now(),
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.flags.toolApproval).toBe(false);
  });

  it('rejects feature flag document with invalid schema version', () => {
    const parsed = parseFeatureFlagDocument({
      _schemaVersion: 2,
      flags: DEFAULT_SERVER_FLAGS,
      updatedAt: Date.now(),
    });
    expect(parsed).toBeNull();
  });

  it('accepts valid connection context', () => {
    const parsed = parseConnectionContext({
      requestId: '9c2193db-73a4-4a8d-a7d5-5b9df66e9d43',
      cwd: '/tmp/worktree',
      workspaceRoot: '/tmp',
      workspaceFingerprint:
        '57f3e35f9cb5d7d50f7b8950f4f3095f4f2f8bff7b11524f6c4e54dbf34ca45d',
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.requestId).toBe('9c2193db-73a4-4a8d-a7d5-5b9df66e9d43');
  });

  it('rejects invalid connection context', () => {
    const parsed = parseConnectionContext({
      requestId: 'invalid-request-id',
      cwd: '',
      workspaceRoot: '/tmp',
      workspaceFingerprint: 'not-a-sha',
    });
    expect(parsed).toBeNull();
  });

  it('accepts valid error payload', () => {
    const parsed = parseErrorPayload({
      code: 'LOCK_CONFLICT',
      message: 'Another git operation is in progress',
      retryable: true,
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.code).toBe('LOCK_CONFLICT');
  });

  it('rejects invalid error payload', () => {
    const parsed = parseErrorPayload({
      code: '',
      message: 42,
      retryable: 'yes',
    });
    expect(parsed).toBeNull();
  });
});
