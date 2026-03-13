import { getPerfSummary, getMemoryUsageMB } from '../../observability/perfBaseline';

export default function AboutTab() {
  const perf = getPerfSummary();
  const memMb = getMemoryUsageMB();

  return (
    <>
      <div className="settings-section">
        <label className="settings-label">About</label>
        <p className="settings-hint">
          Codeye v0.3.0 — A desktop GUI for Claude Code.
        </p>
      </div>

      <div className="settings-section">
        <label className="settings-label">Status</label>
        <div className="settings-status">
          <span className={`status-dot ${window.electronAPI ? 'active' : 'idle'}`} />
          <span>
            {window.electronAPI ? 'Electron Mode' : (
              import.meta.env.VITE_DEMO
                ? 'Demo Mode'
                : 'Browser Mode (WebSocket Proxy)'
            )}
          </span>
        </div>
      </div>

      {perf.sampleCount > 0 && (
        <div className="settings-section">
          <label className="settings-label">Performance</label>
          <div className="perf-stats">
            <div className="perf-stat">
              <span className="perf-stat-label">TTFT p50</span>
              <span className="perf-stat-value">{perf.ttftP50?.toFixed(0) ?? '—'}ms</span>
            </div>
            <div className="perf-stat">
              <span className="perf-stat-label">TTFT p95</span>
              <span className="perf-stat-value">{perf.ttftP95?.toFixed(0) ?? '—'}ms</span>
            </div>
            <div className="perf-stat">
              <span className="perf-stat-label">Avg chunks</span>
              <span className="perf-stat-value">{perf.avgChunks}</span>
            </div>
            {memMb !== null && (
              <div className="perf-stat">
                <span className="perf-stat-label">Memory</span>
                <span className="perf-stat-value">{memMb}MB</span>
              </div>
            )}
            <div className="perf-stat">
              <span className="perf-stat-label">Samples</span>
              <span className="perf-stat-value">{perf.sampleCount}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
