import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';

export default function SessionStats() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cost = useChatStore((s) => s.cost);
  const inputTokens = useChatStore((s) => s.inputTokens);
  const outputTokens = useChatStore((s) => s.outputTokens);

  const hasActivity = cost > 0 || inputTokens > 0 || outputTokens > 0;

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

  return (
    <div className="session-stats" ref={containerRef}>
      <button
        className={`session-stats-trigger ${hasActivity ? 'has-activity' : ''}`}
        onClick={() => setOpen(!open)}
        title="Session stats"
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1.5" y="7" width="2.5" height="5" rx="0.75" fill="currentColor" opacity="0.5" />
          <rect x="5.75" y="4" width="2.5" height="8" rx="0.75" fill="currentColor" opacity="0.7" />
          <rect x="10" y="1.5" width="2.5" height="10.5" rx="0.75" fill="currentColor" />
        </svg>
        {hasActivity && <span className="session-stats-cost">${cost.toFixed(4)}</span>}
      </button>
      {open && (
        <div className="session-stats-panel">
          <div className="session-stats-row">
            <span className="session-stats-label">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 8V2M3 4l2-2 2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Input
            </span>
            <span className="session-stats-value">{inputTokens.toLocaleString()}</span>
          </div>
          <div className="session-stats-row">
            <span className="session-stats-label">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 2v6M3 6l2 2 2-2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Output
            </span>
            <span className="session-stats-value">{outputTokens.toLocaleString()}</span>
          </div>
          <div className="session-stats-divider" />
          <div className="session-stats-row total">
            <span className="session-stats-label">Cost</span>
            <span className="session-stats-value">${cost.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
