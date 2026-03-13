import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { MODELS, EFFORT_LEVELS, getModelInfo, getEffortInfo } from '../../data/models';
import type { ModelId, EffortLevel } from '../../types';

const tierLabels: Record<string, string> = {
  premium: '$$$',
  standard: '$$',
  fast: '$',
};

export default function ModelConfigSelector() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const model = useChatStore((s) => s.model);
  const effort = useChatStore((s) => s.effort);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const setModel = useChatStore((s) => s.setModel);
  const setEffort = useChatStore((s) => s.setEffort);
  const currentModel = getModelInfo(model);
  const currentEffort = getEffortInfo(effort);

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
    <div className="config-selector" ref={containerRef}>
      <button
        className="config-selector-trigger"
        onClick={() => setOpen(!open)}
        disabled={isStreaming}
        title={`${currentModel.label} · ${currentEffort.label}`}
      >
        <span className="config-selector-model">{currentModel.shortLabel}</span>
        <span className="config-selector-sep">·</span>
        <span className="config-selector-effort">{currentEffort.shortLabel}</span>
        <svg className={`config-selector-chevron ${open ? 'open' : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 3.5L5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="config-selector-dropdown">
          <div className="config-section">
            <span className="config-section-title">Model</span>
            {MODELS.map((m) => (
              <button
                key={m.id}
                className={`config-option ${m.id === model ? 'active' : ''}`}
                onClick={() => setModel(m.id as ModelId)}
              >
                <div className="config-option-info">
                  <span className="config-option-label">{m.label}</span>
                  <span className="config-option-desc">{m.description}</span>
                </div>
                <span className="config-tier-badge">{tierLabels[m.tier]}</span>
              </button>
            ))}
          </div>
          <div className="config-divider" />
          <div className="config-section">
            <span className="config-section-title">Thinking</span>
            {EFFORT_LEVELS.map((e) => (
              <button
                key={e.id}
                className={`config-option ${e.id === effort ? 'active' : ''}`}
                onClick={() => setEffort(e.id as EffortLevel)}
              >
                <div className="config-option-info">
                  <span className="config-option-label">{e.label}</span>
                  <span className="config-option-desc">{e.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
