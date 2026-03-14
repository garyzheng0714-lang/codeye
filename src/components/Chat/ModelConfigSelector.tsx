import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import {
  MODELS,
  EFFORT_LEVELS,
  getAllowedEfforts,
  getModelInfo,
  getEffortInfo,
  modelSupportsEffort,
} from '../../data/models';
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
  const supportsEffort = modelSupportsEffort(model);
  const allowedEfforts = getAllowedEfforts(model);
  const visibleEfforts = EFFORT_LEVELS.filter((entry) => allowedEfforts.includes(entry.id));

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
        title={`${currentModel.label} · ${supportsEffort ? currentEffort.label : 'Thinking unavailable'}`}
      >
        <span className="config-selector-model">{currentModel.shortLabel}</span>
        <span className="config-selector-sep">·</span>
        <span className="config-selector-effort">{supportsEffort ? currentEffort.shortLabel : 'N/A'}</span>
        <ChevronDown size={11} strokeWidth={2} className={`config-selector-chevron ${open ? 'open' : ''}`} />
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
            {supportsEffort ? (
              visibleEfforts.map((entry) => (
                <button
                  key={entry.id}
                  className={`config-option ${entry.id === effort ? 'active' : ''}`}
                  onClick={() => setEffort(entry.id as EffortLevel)}
                >
                  <div className="config-option-info">
                    <span className="config-option-label">{entry.label}</span>
                    <span className="config-option-desc">{entry.description}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="config-option-hint">Thinking controls are not available for this model.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
