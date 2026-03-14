import { useState } from 'react';

interface Props {
  toolName: string;
  input: Record<string, unknown>;
  onApprove: () => void;
  onDeny: () => void;
}

export default function ToolApproval({ toolName, input, onApprove, onDeny }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tool-approval" role="alertdialog" aria-label="Tool approval required">
      <div className="tool-approval-header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L1 8l7 7 7-7-7-7z" stroke="var(--warning)" strokeWidth="1.2" />
          <path d="M8 5v3" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="10.5" r="0.75" fill="var(--warning)" />
        </svg>
        <span className="tool-approval-name">{toolName}</span>
        <span className="tool-approval-label">needs approval</span>
      </div>
      {Object.keys(input).length > 0 && (
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
              {JSON.stringify(input, null, 2)}
            </pre>
          )}
        </>
      )}
      <div className="tool-approval-actions">
        <button type="button" className="tool-approval-approve" onClick={onApprove}>
          Approve
        </button>
        <button type="button" className="tool-approval-deny" onClick={onDeny}>
          Deny
        </button>
      </div>
    </div>
  );
}
