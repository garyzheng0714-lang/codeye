import { useState, useEffect, useRef, useMemo } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import { normalizeModelId, toCliModelId } from '../../data/models';

const CONTEXT_WINDOWS: Record<'opus' | 'sonnet' | 'haiku', number> = {
  opus: 200_000,
  sonnet: 200_000,
  haiku: 200_000,
};

function formatCompactTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function formatCost(value: number): string {
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(4)}`;
}

const RING_R = 8;
const RING_C = 2 * Math.PI * RING_R;

function ContextRing({ usedPercent, cost }: { usedPercent: number; cost: number }) {
  const clamped = Math.min(Math.max(usedPercent, 0), 100);
  const offset = RING_C * (1 - clamped / 100);

  const color =
    clamped >= 80 ? 'var(--danger)' :
    clamped >= 50 ? 'var(--warning)' :
    'var(--accent)';

  return (
    <span className="context-ring-group">
      <svg className="context-ring" width="22" height="22" viewBox="0 0 22 22">
        <circle
          cx="11" cy="11" r={RING_R}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="2.5"
        />
        <circle
          className="context-ring-fill"
          cx="11" cy="11" r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          transform="rotate(-90 11 11)"
        />
      </svg>
      <span className="context-ring-cost">{formatCost(cost)}</span>
    </span>
  );
}

function useUsageSummary() {
  const sessions = useSessionStore((s) => s.sessions);
  const currentCost = useChatStore((s) => s.cost);

  return useMemo(() => {
    const nowMs = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    let dayCost = 0;
    let weekCost = 0;

    for (const session of sessions) {
      if (session.updatedAt >= todayStart.getTime()) {
        dayCost += session.cost;
      }
      if (session.updatedAt >= weekStart.getTime()) {
        weekCost += session.cost;
      }
    }

    // Add current unsaved session cost
    dayCost += currentCost;
    weekCost += currentCost;

    return { dayCost, weekCost, asOf: nowMs };
  }, [sessions, currentCost]);
}

export default function SessionStats() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const model = useChatStore((s) => s.model);
  const cost = useChatStore((s) => s.cost);
  const inputTokens = useChatStore((s) => s.inputTokens);
  const outputTokens = useChatStore((s) => s.outputTokens);
  const pendingCount = useChatStore((s) => s.pendingMessages.length);

  const usedTokens = inputTokens + outputTokens;
  const modelAlias = toCliModelId(normalizeModelId(model));
  const contextWindow = CONTEXT_WINDOWS[modelAlias];
  const remainingTokens = Math.max(contextWindow - usedTokens, 0);
  const usedPercent = Math.round((usedTokens / contextWindow) * 100);
  const lowContext = usedPercent >= 80;

  const tooltipText = `${formatCompactTokens(usedTokens)} / ${formatCompactTokens(contextWindow)}`;
  const { dayCost, weekCost } = useUsageSummary();

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
        className="session-stats-trigger has-activity"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="context-ring-wrapper">
          <ContextRing usedPercent={usedPercent} cost={cost} />
          <span className="context-ring-tooltip">{tooltipText}</span>
        </span>
        {pendingCount > 0 && <span className="session-stats-queue">+{pendingCount}</span>}
      </button>
      {open && (
        <div className="session-stats-panel">
          <div className="session-stats-section-title">This session</div>
          <div className="session-stats-row">
            <span className="session-stats-label">Input</span>
            <span className="session-stats-value">{inputTokens.toLocaleString()}</span>
          </div>
          <div className="session-stats-row">
            <span className="session-stats-label">Output</span>
            <span className="session-stats-value">{outputTokens.toLocaleString()}</span>
          </div>
          <div className="session-stats-row">
            <span className="session-stats-label">Context</span>
            <span className={`session-stats-value ${lowContext ? 'low' : ''}`}>
              {formatCompactTokens(remainingTokens)} left ({100 - usedPercent}%)
            </span>
          </div>
          <div className="session-stats-row">
            <span className="session-stats-label">Cost</span>
            <span className="session-stats-value accent">{formatCost(cost)}</span>
          </div>
          <div className="session-stats-divider" />
          <div className="session-stats-section-title">Usage</div>
          <div className="session-stats-row">
            <span className="session-stats-label">Today</span>
            <span className="session-stats-value">{formatCost(dayCost)}</span>
          </div>
          <div className="session-stats-row">
            <span className="session-stats-label">This week</span>
            <span className="session-stats-value">{formatCost(weekCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
