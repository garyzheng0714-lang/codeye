import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildApprovalResponse,
  startApprovalTimeout,
  clearApprovalTimeout,
  clearAllForTests,
  denyAllPending,
} from './toolApproval';

vi.mock('./websocket', () => ({
  sendMessage: vi.fn(),
  subscribeWsMessages: vi.fn(() => () => {}),
  getOrCreateWs: vi.fn(),
}));

afterEach(() => { clearAllForTests(); });

describe('toolApproval service', () => {
  it('builds correct approval response envelope', () => {
    const msg = buildApprovalResponse('aaa', 'allow', 'ccc');
    expect(msg.version).toBe(1);
    expect(msg.type).toBe('tool_approval_response');
    expect(msg.correlationId).toBe('ccc');
    expect(msg.payload.approvalId).toBe('aaa');
    expect(msg.payload.decision).toBe('allow');
  });

  it('builds response without correlationId when not provided', () => {
    const msg = buildApprovalResponse('aaa', 'deny');
    expect(msg.correlationId).toBeUndefined();
  });

  it('starts timeout that invokes callback', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    startApprovalTimeout('test-id', 2, cb);
    vi.advanceTimersByTime(2000);
    expect(cb).toHaveBeenCalledWith('test-id');
    vi.useRealTimers();
  });

  it('clearApprovalTimeout prevents callback', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    startApprovalTimeout('test-id', 5, cb);
    clearApprovalTimeout('test-id');
    vi.advanceTimersByTime(5000);
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('denyAllPending invokes callback for each tracked approval', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    startApprovalTimeout('a1', 120, cb);
    startApprovalTimeout('a2', 120, cb);

    const denyCb = vi.fn();
    denyAllPending(denyCb);

    expect(denyCb).toHaveBeenCalledTimes(2);
    expect(denyCb).toHaveBeenCalledWith('a1');
    expect(denyCb).toHaveBeenCalledWith('a2');
    vi.useRealTimers();
  });
});
