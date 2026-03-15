type ApprovalResolver = (decision: 'allow' | 'deny') => void;

const pendingApprovals = new Map<string, ApprovalResolver>();

export function registerApprovalRequest(approvalId: string): Promise<'allow' | 'deny'> {
  return new Promise<'allow' | 'deny'>((resolve) => {
    pendingApprovals.set(approvalId, resolve);
  });
}

export function resolveApprovalResponse(approvalId: string, decision: 'allow' | 'deny'): boolean {
  const resolver = pendingApprovals.get(approvalId);
  if (!resolver) return false;
  pendingApprovals.delete(approvalId);
  resolver(decision);
  return true;
}

export function hasPendingApproval(approvalId: string): boolean {
  return pendingApprovals.has(approvalId);
}

export function resetForTests(): void {
  pendingApprovals.clear();
}
