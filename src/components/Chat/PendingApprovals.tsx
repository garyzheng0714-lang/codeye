import { memo } from 'react';
import { useChatStore } from '../../stores/chatStore';
import ToolApproval from './ToolApproval';

export default memo(function PendingApprovals() {
  const pendingApprovals = useChatStore((s) => s.pendingApprovals);
  const approvals = Object.values(pendingApprovals);

  if (approvals.length === 0) return null;

  return (
    <div className="pending-approvals">
      {approvals.map((approval) => (
        <ToolApproval key={approval.approvalId} approval={approval} />
      ))}
    </div>
  );
});
