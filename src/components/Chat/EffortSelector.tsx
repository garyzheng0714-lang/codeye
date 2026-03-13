import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { EFFORT_LEVELS, getEffortInfo } from '../../data/models';
import type { EffortLevel } from '../../types';

const effortIcons: Record<EffortLevel, string> = {
  low: '1',
  medium: '2',
  high: '3',
  max: '4',
};

export default function EffortSelector() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { effort, setEffort, isStreaming } = useChatStore();
  const current = getEffortInfo(effort);

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

  const handleSelect = (id: EffortLevel) => {
    setEffort(id);
    setOpen(false);
  };

  return (
    <div className="effort-selector" ref={containerRef}>
      <button
        className="effort-selector-trigger"
        onClick={() => setOpen(!open)}
        disabled={isStreaming}
        title={`Thinking: ${current.label}`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
          <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="effort-selector-label">{current.shortLabel}</span>
        <svg className={`effort-selector-chevron ${open ? 'open' : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 3.5L5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="effort-selector-dropdown">
          {EFFORT_LEVELS.map((e) => (
            <button
              key={e.id}
              className={`effort-option ${e.id === effort ? 'active' : ''}`}
              onClick={() => handleSelect(e.id)}
            >
              <div className="effort-option-info">
                <span className="effort-option-label">{e.label}</span>
                <span className="effort-option-desc">{e.description}</span>
              </div>
              <span className="effort-level-badge">{effortIcons[e.id]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
