import { describe, expect, it, afterEach } from 'vitest';
import {
  registerApprovalRequest,
  resolveApprovalResponse,
  hasPendingApproval,
  resetForTests,
} from './approvalQueue';

afterEach(() => { resetForTests(); });

describe('approvalQueue', () => {
  it('resolves pending approval on matching response', async () => {
    const approvalId = crypto.randomUUID();
    const promise = registerApprovalRequest(approvalId);
    resolveApprovalResponse(approvalId, 'allow');
    const decision = await promise;
    expect(decision).toBe('allow');
  });

  it('returns false for unknown approvalId', () => {
    const result = resolveApprovalResponse(crypto.randomUUID(), 'deny');
    expect(result).toBe(false);
  });

  it('hasPendingApproval returns true for registered', () => {
    const approvalId = crypto.randomUUID();
    registerApprovalRequest(approvalId);
    expect(hasPendingApproval(approvalId)).toBe(true);
  });

  it('hasPendingApproval returns false after resolve', async () => {
    const approvalId = crypto.randomUUID();
    const promise = registerApprovalRequest(approvalId);
    resolveApprovalResponse(approvalId, 'deny');
    await promise;
    expect(hasPendingApproval(approvalId)).toBe(false);
  });

  it('second resolve for same approvalId returns false', async () => {
    const approvalId = crypto.randomUUID();
    const promise = registerApprovalRequest(approvalId);
    expect(resolveApprovalResponse(approvalId, 'allow')).toBe(true);
    expect(resolveApprovalResponse(approvalId, 'deny')).toBe(false);
    await promise;
  });
});
