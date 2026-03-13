import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { MODELS, getModelInfo } from '../../data/models';
import type { ModelId } from '../../types';

const tierColors: Record<string, string> = {
  premium: 'var(--accent)',
  standard: 'var(--info)',
  fast: 'var(--success)',
};

const tierLabels: Record<string, string> = {
  premium: '$$$',
  standard: '$$',
  fast: '$',
};

export default function ModelSelector() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { model, setModel, isStreaming } = useChatStore();
  const current = getModelInfo(model);

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

  const handleSelect = (id: ModelId) => {
    setModel(id);
    setOpen(false);
  };

  return (
    <div className="model-selector" ref={containerRef}>
      <button
        className="model-selector-trigger"
        onClick={() => setOpen(!open)}
        disabled={isStreaming}
        title={`Model: ${current.label}`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M8 2l1.5 2.5h3l-2.4 1.8.9 3L8 7.5 4.9 9.3l1-3L3.5 4.5h3L8 2z" fill="currentColor" opacity="0.85" />
          <path d="M4 12h8M5.5 14h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        </svg>
        <span className="model-selector-label">{current.shortLabel}</span>
        <span className="model-tier-badge" style={{ color: tierColors[current.tier] }}>
          {tierLabels[current.tier]}
        </span>
        <svg className={`model-selector-chevron ${open ? 'open' : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 3.5L5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="model-selector-dropdown">
          {MODELS.map((m) => (
            <button
              key={m.id}
              className={`model-option ${m.id === model ? 'active' : ''}`}
              onClick={() => handleSelect(m.id)}
            >
              <div className="model-option-info">
                <span className="model-option-label">{m.label}</span>
                <span className="model-option-desc">{m.description}</span>
              </div>
              <span className="model-tier-badge" style={{ color: tierColors[m.tier] }}>
                {tierLabels[m.tier]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
