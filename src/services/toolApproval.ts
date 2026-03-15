import { sendMessage } from './websocket';

const timeoutTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function buildApprovalResponse(
  approvalId: string,
  decision: 'allow' | 'deny',
  correlationId?: string
) {
  return {
    version: 1,
    type: 'tool_approval_response' as const,
    ...(correlationId ? { correlationId } : {}),
    payload: { approvalId, decision },
  };
}

export function sendApprovalDecision(
  approvalId: string,
  decision: 'allow' | 'deny',
  correlationId?: string
) {
  clearApprovalTimeout(approvalId);
  const msg = buildApprovalResponse(approvalId, decision, correlationId);
  sendMessage(msg as unknown as Record<string, unknown>);
}

export function startApprovalTimeout(
  approvalId: string,
  timeoutSec: number,
  onTimeout: (approvalId: string) => void
) {
  clearApprovalTimeout(approvalId);
  const timer = setTimeout(() => {
    timeoutTimers.delete(approvalId);
    onTimeout(approvalId);
  }, timeoutSec * 1000);
  timeoutTimers.set(approvalId, timer);
}

export function clearApprovalTimeout(approvalId: string) {
  const timer = timeoutTimers.get(approvalId);
  if (timer) {
    clearTimeout(timer);
    timeoutTimers.delete(approvalId);
  }
}

export function denyAllPending(onDeny: (approvalId: string) => void) {
  for (const approvalId of [...timeoutTimers.keys()]) {
    clearApprovalTimeout(approvalId);
    onDeny(approvalId);
  }
}

export function clearAllForTests() {
  for (const timer of timeoutTimers.values()) {
    clearTimeout(timer);
  }
  timeoutTimers.clear();
}
