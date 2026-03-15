import { GitBranch } from 'lucide-react';
import GitActionMenu from './GitActionMenu';
import { useGitStatus } from '../../hooks/useGitStatus';

export default function TitleBar() {
  const { status, loading, refresh } = useGitStatus();

  return (
    <div className="title-bar">
      <div className="title-bar-content">
        <div className="title-bar-left">
          <span className="title-bar-logo">
            <svg width="18" height="18" viewBox="0 0 120 120" fill="none">
              <path d="M52 8C30 10, 10 30, 12 58C14 86, 34 110, 62 110C90 110, 112 86, 110 56C108 28, 88 6, 66 6C60 6, 56 7, 52 8Z" fill="var(--accent)" />
              <ellipse cx="48" cy="62" rx="9" ry="12" fill="white" />
              <ellipse cx="72" cy="62" rx="9" ry="12" fill="white" />
              <ellipse cx="50" cy="65" rx="5" ry="7" fill="#0d0b11" />
              <ellipse cx="74" cy="65" rx="5" ry="7" fill="#0d0b11" />
            </svg>
          </span>
          <span className="title-bar-name">Codeye</span>
        </div>
        <div className="title-bar-center">
          {status.available ? (
            <button
              type="button"
              className="title-git-chip"
              onClick={() => void refresh()}
              title="Refresh git status"
            >
              <GitBranch size={12} strokeWidth={2} />
              <span className="title-git-branch">{status.branch || 'detached'}</span>
              {status.dirty && <span className="title-git-dirty" aria-hidden="true" />}
              {(status.ahead > 0 || status.behind > 0) && (
                <span className="title-git-sync">↑{status.ahead} ↓{status.behind}</span>
              )}
              {loading && <span className="title-git-loading">Syncing</span>}
            </button>
          ) : null}
        </div>
        <div className="title-bar-actions">
          <GitActionMenu />
        </div>
      </div>
    </div>
  );
}
