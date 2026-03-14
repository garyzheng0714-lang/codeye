import ModelConfigSelector from './ModelConfigSelector';
import SessionStats from './SessionStats';
import GitActionMenu from '../Layout/GitActionMenu';
import { useUIStore } from '../../stores/uiStore';
import { useGitStatus } from '../../hooks/useGitStatus';

const permissionLabelMap = {
  default: '默认权限',
  plan: '计划模式',
  'full-access': '完全访问权限',
} as const;

export default function InputFooter() {
  const permissionMode = useUIStore((s) => s.permissionMode);
  const { status, loading, refresh } = useGitStatus();

  return (
    <div className="input-footer">
      <div className="input-footer-left">
        <span className="footer-chip">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="1.5" y="2" width="7" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1" />
            <path d="M3 8h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
          本地
        </span>
        <span className={`footer-chip permission-chip permission-chip-${permissionMode}`}>
          {permissionLabelMap[permissionMode]}
        </span>

        {status.available ? (
          <button className="git-status-chip" onClick={() => void refresh()} title="Refresh git status" type="button">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1.5V8.5M2 5.5L5 8.5L8 5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{status.branch || 'detached'}</span>
            {status.dirty && <span className="git-dirty-dot" aria-hidden="true" />}
            {(status.ahead > 0 || status.behind > 0) && (
              <span className="git-sync-counter">+{status.ahead}/-{status.behind}</span>
            )}
          </button>
        ) : (
          <span className="footer-chip git-status-empty">No Git</span>
        )}
        {loading && <span className="footer-chip footer-chip-muted">同步中</span>}
      </div>
      <div className="input-footer-right">
        <GitActionMenu />
        <ModelConfigSelector />
        <SessionStats />
      </div>
    </div>
  );
}
