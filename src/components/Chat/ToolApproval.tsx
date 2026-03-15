import { useEffect, useState, memo } from 'react';
import { Shield, Check, X, Timer } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { sendApprovalDecision, clearApprovalTimeout } from '../../services/toolApproval';
import type { PendingApproval } from '../../types';

export default memo(function ToolApproval({ approval }: { approval: PendingApproval }) {
  const resolveApproval = useChatStore((s) => s.resolveApproval);
  const [expanded, setExpanded] = useState(false);
  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor((Date.now() - approval.receivedAt) / 1000);
    return Math.max(0, approval.timeoutSec - elapsed);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - approval.receivedAt) / 1000);
      const left = Math.max(0, approval.timeoutSec - elapsed);
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [approval.receivedAt, approval.timeoutSec]);

  const handleDecision = (decision: 'allow' | 'deny') => {
    resolveApproval(approval.approvalId, decision);
    sendApprovalDecision(approval.approvalId, decision);
  };

  return (
    <div className="tool-approval" role="alertdialog" aria-label="Tool approval required">
      <div className="tool-approval-header">
        <Shield size={14} strokeWidth={1.8} className="tool-approval-shield" />
        <span className="tool-approval-name">{approval.toolName}</span>
        <span className="tool-approval-label">needs approval</span>
        <span className="tool-approval-timer">
          <Timer size={11} strokeWidth={2} />
          {remaining}s
        </span>
      </div>
      {Object.keys(approval.args).length > 0 && (
        <>
          <button
            type="button"
            className="tool-approval-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? 'Hide' : 'Show'} arguments
          </button>
          {expanded && (
            <pre className="tool-approval-args">
              {JSON.stringify(approval.args, null, 2)}
            </pre>
          )}
        </>
      )}
      <div className="tool-approval-actions">
        <button type="button" className="tool-approval-approve" onClick={() => handleDecision('allow')}>
          <Check size={13} strokeWidth={2} /> Approve
        </button>
        <button type="button" className="tool-approval-deny" onClick={() => handleDecision('deny')}>
          <X size={13} strokeWidth={2} /> Deny
        </button>
      </div>
    </div>
  );
});
