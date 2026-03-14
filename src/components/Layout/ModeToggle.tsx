import { useCallback, useEffect } from 'react';
import { useUIStore, type PermissionMode } from '../../stores/uiStore';

const modes: { id: PermissionMode; label: string; shortLabel: string }[] = [
  { id: 'default', label: 'Default', shortLabel: 'Default' },
  { id: 'plan', label: 'Plan', shortLabel: 'Plan' },
  { id: 'full-access', label: 'Full Access', shortLabel: 'Full' },
];

export default function ModeToggle() {
  const { permissionMode, setPermissionMode } = useUIStore();

  const activeIndex = modes.findIndex((m) => m.id === permissionMode);

  const cycleMode = useCallback(
    (direction: 1 | -1) => {
      const next = (activeIndex + direction + modes.length) % modes.length;
      setPermissionMode(modes[next].id);
    },
    [activeIndex, setPermissionMode],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Tab') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        cycleMode(1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cycleMode]);

  return (
    <div className="mode-toggle" role="radiogroup" aria-label="Permission mode">
      <div
        className={`mode-toggle-slider mode-toggle-slider--${permissionMode}`}
        style={{
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {modes.map((mode) => (
        <button
          key={mode.id}
          role="radio"
          type="button"
          tabIndex={permissionMode === mode.id ? 0 : -1}
          aria-checked={permissionMode === mode.id}
          className={`mode-toggle-item ${permissionMode === mode.id ? 'active' : ''} mode-toggle-item--${mode.id}`}
          onClick={() => setPermissionMode(mode.id)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              cycleMode(1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              cycleMode(-1);
            }
          }}
        >
          {mode.id === 'full-access' && (
            <svg className="mode-toggle-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.5L2 4.5v4c0 3.5 2.5 5.8 6 7 3.5-1.2 6-3.5 6-7v-4L8 1.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M5.5 8.5l2 2 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className="mode-toggle-label">{mode.label}</span>
          <span className="mode-toggle-label-short">{mode.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
