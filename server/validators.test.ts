import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createWorkspaceFingerprint,
  parseClientRequestEvent,
  validateGitRequestEvent,
} from './validators';

const tempRoots: string[] = [];

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codeye-validator-'));
  tempRoots.push(root);
  const cwd = path.join(root, 'repo');
  fs.mkdirSync(cwd, { recursive: true });
  return { root, cwd };
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (!root) continue;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('validators for cycle-a request envelopes', () => {
  it('accepts git_status_request envelope', () => {
    const { root, cwd } = makeWorkspace();
    const fingerprint = createWorkspaceFingerprint(root, cwd);
    const result = validateGitRequestEvent({
      version: 1,
      type: 'git_status_request',
      payload: {
        requestId: '9c2193db-73a4-4a8d-a7d5-5b9df66e9d43',
        cwd,
        workspaceRoot: root,
        workspaceFingerprint: fingerprint,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('git_status_request');
      expect(result.value.payload.cwd).toBe(cwd);
    }
  });

  it('rejects request missing version', () => {
    const { root, cwd } = makeWorkspace();
    const fingerprint = createWorkspaceFingerprint(root, cwd);
    const result = validateGitRequestEvent({
      type: 'git_status_request',
      payload: {
        requestId: '9c2193db-73a4-4a8d-a7d5-5b9df66e9d43',
        cwd,
        workspaceRoot: root,
        workspaceFingerprint: fingerprint,
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    }
  });

  it('rejects cwd outside workspace root', () => {
    const { root } = makeWorkspace();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'codeye-validator-out-'));
    tempRoots.push(outside);
    const fingerprint = createWorkspaceFingerprint(root, outside);
    const result = validateGitRequestEvent({
      version: 1,
      type: 'git_status_request',
      payload: {
        requestId: '9c2193db-73a4-4a8d-a7d5-5b9df66e9d43',
        cwd: outside,
        workspaceRoot: root,
        workspaceFingerprint: fingerprint,
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('OUTSIDE_WORKSPACE');
    }
  });

  it('rejects fingerprint mismatch', () => {
    const { root, cwd } = makeWorkspace();
    const result = validateGitRequestEvent({
      version: 1,
      type: 'git_status_request',
      payload: {
        requestId: '9c2193db-73a4-4a8d-a7d5-5b9df66e9d43',
        cwd,
        workspaceRoot: root,
        workspaceFingerprint:
          '57f3e35f9cb5d7d50f7b8950f4f3095f4f2f8bff7b11524f6c4e54dbf34ca45d',
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FINGERPRINT_MISMATCH');
    }
  });

  it('rejects when ws-bound workspace root differs', () => {
    const { root, cwd } = makeWorkspace();
    const fingerprint = createWorkspaceFingerprint(root, cwd);
    const result = validateGitRequestEvent(
      {
        version: 1,
        type: 'git_status_request',
        payload: {
          requestId: '9c2193db-73a4-4a8d-a7d5-5b9df66e9d43',
          cwd,
          workspaceRoot: root,
          workspaceFingerprint: fingerprint,
        },
      },
      { boundWorkspaceRoot: path.join(root, 'other') }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('WORKSPACE_CONTEXT_MISMATCH');
    }
  });

  it('accepts git_commit_request with valid operationId', () => {
    const { root, cwd } = makeWorkspace();
    const fingerprint = createWorkspaceFingerprint(root, cwd);
    const result = validateGitRequestEvent({
      version: 1,
      type: 'git_commit_request',
      correlationId: '11111111-1111-4111-8111-111111111111',
      payload: {
        requestId: '9c2193db-73a4-4a8d-a7d5-5b9df66e9d43',
        operationId: '22222222-2222-4222-8222-222222222222',
        message: 'feat: add protocol checks',
        cwd,
        workspaceRoot: root,
        workspaceFingerprint: fingerprint,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('git_commit_request');
    }
  });

  it('rejects git_commit_request with invalid operationId', () => {
    const { root, cwd } = makeWorkspace();
    const fingerprint = createWorkspaceFingerprint(root, cwd);
    const result = validateGitRequestEvent({
      version: 1,
      type: 'git_commit_request',
      payload: {
        requestId: '9c2193db-73a4-4a8d-a7d5-5b9df66e9d43',
        operationId: 'not-a-uuid',
        message: 'feat: add protocol checks',
        cwd,
        workspaceRoot: root,
        workspaceFingerprint: fingerprint,
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    }
  });

  it('parses tool_approval_response envelope', () => {
    const parsed = parseClientRequestEvent({
      version: 1,
      type: 'tool_approval_response',
      payload: {
        approvalId: '48ad9f9f-315f-4991-85c2-a3d89e4479fb',
        decision: 'allow',
      },
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('tool_approval_response');
  });
});
