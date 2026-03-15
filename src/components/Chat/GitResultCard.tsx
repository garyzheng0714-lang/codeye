import { memo } from 'react';
import {
  GitCommitHorizontal,
  ArrowUpFromLine,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { GitResultDisplay } from '../../types';

const actionIcons = {
  commit: GitCommitHorizontal,
  push: ArrowUpFromLine,
  pr: GitPullRequest,
};

const successLabels = { commit: 'Committed', push: 'Pushed', pr: 'PR Created' };
const errorLabels = { commit: 'Commit failed', push: 'Push failed', pr: 'PR failed' };

export default memo(function GitResultCard({ result }: { result: GitResultDisplay }) {
  const Icon = actionIcons[result.action];

  return (
    <div className={`git-result-card git-result-card--${result.success ? 'success' : 'error'}`}>
      <div className="git-result-card-header">
        {result.success ? (
          <CheckCircle2 size={14} strokeWidth={1.8} className="git-result-icon success" />
        ) : (
          <AlertCircle size={14} strokeWidth={1.8} className="git-result-icon error" />
        )}
        <Icon size={14} strokeWidth={1.8} />
        <span className="git-result-label">
          {result.success ? successLabels[result.action] : errorLabels[result.action]}
        </span>
      </div>
      <div className="git-result-card-body">
        {result.success && result.action === 'commit' && (
          <span><code>{result.hash}</code> {result.message}</span>
        )}
        {result.success && result.action === 'push' && (
          <span>{result.remote}/{result.branch || 'current'}</span>
        )}
        {result.success && result.action === 'pr' && result.url && (
          <a href={result.url} target="_blank" rel="noopener noreferrer">#{result.number}</a>
        )}
        {!result.success && result.error && (
          <span className="git-result-error-msg">{result.error.message}</span>
        )}
        {!result.success && result.manualCommand && (
          <code className="git-result-manual">{result.manualCommand}</code>
        )}
      </div>
    </div>
  );
});
