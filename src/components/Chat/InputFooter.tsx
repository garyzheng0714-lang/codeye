import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, GitBranch } from 'lucide-react';
import ModelConfigSelector from './ModelConfigSelector';
import SessionStats from './SessionStats';
import { useUIStore, type PermissionMode } from '../../stores/uiStore';
import { useGitStatus } from '../../hooks/useGitStatus';

const permissionOptions: { id: PermissionMode; label: string; description: string; color: string }[] = [
  { id: 'default', label: 'Default', description: 'Ask before risky actions', color: 'var(--text-muted)' },
  { id: 'plan', label: 'Plan', description: 'Read-only, no changes', color: '#818cf8' },
  { id: 'full-access', label: 'Full Access', description: 'Skip all confirmations', color: '#fbbf24' },
];

export default function InputFooter() {
  const permissionMode = useUIStore((s) => s.permissionMode);
  const setPermissionMode = useUIStore((s) => s.setPermissionMode);
  const { status, loading, refresh } = useGitStatus();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = permissionOptions.find((o) => o.id === permissionMode) ?? permissionOptions[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleSelect = (mode: PermissionMode) => {
    setPermissionMode(mode);
    setOpen(false);
  };

  return (
    <div className="input-footer">
      <div className="input-footer-left">
        <div className="permission-selector" ref={containerRef}>
          <button
            className={`permission-selector-trigger permission-trigger--${permissionMode}`}
            onClick={() => setOpen((v) => !v)}
            type="button"
            title="Permission mode"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="permission-dot" style={{ background: current.color }} />
            <span className="permission-trigger-label">{current.label}</span>
            <ChevronDown size={11} strokeWidth={2} className={`permission-chevron ${open ? 'open' : ''}`} />
          </button>
          {open && (
            <div className="permission-dropdown">
              {permissionOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={`permission-option ${opt.id === permissionMode ? 'active' : ''}`}
                  onClick={() => handleSelect(opt.id)}
                  type="button"
                >
                  <span className="permission-option-dot" style={{ background: opt.color }} />
                  <div className="permission-option-info">
                    <span className="permission-option-label">{opt.label}</span>
                    <span className="permission-option-desc">{opt.description}</span>
                  </div>
                  {opt.id === permissionMode && (
                    <Check size={13} strokeWidth={2} className="permission-check" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {status.available ? (
          <button className="git-status-chip" onClick={() => void refresh()} title="Refresh git status" type="button">
            <GitBranch size={11} strokeWidth={2} />
            <span>{status.branch || 'detached'}</span>
            {status.dirty && <span className="git-dirty-dot" aria-hidden="true" />}
            {(status.ahead > 0 || status.behind > 0) && (
              <span className="git-sync-counter">+{status.ahead}/-{status.behind}</span>
            )}
          </button>
        ) : (
          <span className="footer-chip git-status-empty">No Git</span>
        )}
        {loading && <span className="footer-chip footer-chip-muted">Syncing</span>}
      </div>
      <div className="input-footer-right">
        <ModelConfigSelector />
        <SessionStats />
      </div>
    </div>
  );
}
