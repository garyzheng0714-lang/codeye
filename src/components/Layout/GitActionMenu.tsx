import { useState } from 'react';
import { GitCommitHorizontal } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import GitConfirmPanel from '../Chat/GitConfirmPanel';

export default function GitActionMenu() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isStreaming = useChatStore((s) => s.isStreaming);

  return (
    <>
      <button
        type="button"
        className="git-submit-btn"
        onClick={() => !isStreaming && setConfirmOpen(true)}
        disabled={isStreaming}
        title="Commit changes"
      >
        <GitCommitHorizontal size={14} strokeWidth={1.8} />
        <span>Submit</span>
      </button>

      {confirmOpen && (
        <GitConfirmPanel onClose={() => setConfirmOpen(false)} />
      )}
    </>
  );
}
