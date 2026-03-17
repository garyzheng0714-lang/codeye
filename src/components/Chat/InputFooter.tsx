import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import ModelConfigSelector from './ModelConfigSelector';
import SessionStats from './SessionStats';
import DropdownPortal from './DropdownPortal';
import { useUIStore, type PermissionMode } from '../../stores/uiStore';

const permissionOptions: { id: PermissionMode; label: string; description: string; color: string }[] = [
  { id: 'default', label: 'Default', description: 'Ask before risky actions', color: 'var(--text-muted)' },
  { id: 'plan', label: 'Plan', description: 'Read-only, no changes', color: '#818cf8' },
  { id: 'full-access', label: 'Full Access', description: 'Skip all confirmations', color: '#fbbf24' },
];

export default function InputFooter() {
  const permissionMode = useUIStore((s) => s.permissionMode);
  const setPermissionMode = useUIStore((s) => s.setPermissionMode);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = permissionOptions.find((o) => o.id === permissionMode) ?? permissionOptions[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
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
        <ModelConfigSelector />
        <div className="permission-selector">
          <button
            ref={triggerRef}
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
          <DropdownPortal anchorRef={triggerRef} open={open} className="permission-dropdown" align="left">
            <div ref={dropdownRef}>
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
          </DropdownPortal>
        </div>
      </div>
      <div className="input-footer-right">
        <SessionStats />
      </div>
    </div>
  );
}
