import { useEffect, useRef, useState } from 'react';
import { GitCommitHorizontal, ArrowUpFromLine, GitPullRequest, ChevronDown, ArrowRight } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import GitConfirmPanel from '../Chat/GitConfirmPanel';
import type { GitWriteAction } from '../../services/gitWrite';

interface GitAction {
  key: GitWriteAction;
  title: string;
  description: string;
}

const gitActions: GitAction[] = [
  {
    key: 'commit',
    title: 'Commit Changes',
    description: 'Review staged diff and create a commit.',
  },
  {
    key: 'push',
    title: 'Push Branch',
    description: 'Push the current branch to remote.',
  },
  {
    key: 'pr',
    title: 'Create PR',
    description: 'Open a pull request for this branch.',
  },
];

const actionIcons = {
  commit: GitCommitHorizontal,
  push: ArrowUpFromLine,
  pr: GitPullRequest,
};

export default function GitActionMenu() {
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<GitWriteAction | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isStreaming = useChatStore((s) => s.isStreaming);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openConfirmPanel = (action: GitAction) => {
    if (isStreaming) return;
    setOpen(false);
    setConfirmAction(action.key);
  };

  const handleCommitDirect = () => {
    if (isStreaming) return;
    setConfirmAction('commit');
  };

  return (
    <>
      <div className={`git-pill-shell ${open ? 'open' : ''}`} ref={menuRef}>
        <div className={`git-split-btn ${open ? 'open' : ''}`}>
          <button
            type="button"
            className="git-split-main"
            onClick={handleCommitDirect}
            disabled={isStreaming}
            title="Commit changes"
          >
            <span className="git-chip-mark" aria-hidden="true" />
            <span className="title-chip-text">Submit</span>
          </button>
          <button
            type="button"
            className="git-split-chevron"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            title="More git actions"
          >
            <ChevronDown size={11} strokeWidth={2} className={`git-pill-chevron ${open ? 'open' : ''}`} />
          </button>
        </div>

        <div className={`git-dropdown ${open ? 'open' : ''}`} role="menu" aria-hidden={!open}>
          <div className="git-dropdown-header">
            <span className="git-dropdown-title">Git Actions</span>
            <span className="git-dropdown-hint">Commit, push, or open a PR from here.</span>
          </div>

          <div className="git-menu-list">
            {gitActions.map((action) => {
              const Icon = actionIcons[action.key];
              return (
                <button
                  key={action.key}
                  type="button"
                  className="git-menu-item"
                  role="menuitem"
                  onClick={() => openConfirmPanel(action)}
                  disabled={isStreaming}
                >
                  <span className="git-menu-icon">
                    <Icon size={16} strokeWidth={1.8} />
                  </span>
                  <span className="git-menu-copy">
                    <span className="git-menu-title">{action.title}</span>
                    <span className="git-menu-description">{action.description}</span>
                  </span>
                  <ArrowRight size={13} strokeWidth={1.8} className="git-menu-arrow" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {confirmAction && (
        <GitConfirmPanel
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
