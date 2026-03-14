import { useEffect, useMemo, useState } from 'react';
import { getPerfSummary, getMemoryUsageMB } from '../../observability/perfBaseline';

export default function AboutTab() {
  const perf = getPerfSummary();
  const memMb = getMemoryUsageMB();
  const updater = window.electronAPI?.updater;

  const [updateState, setUpdateState] = useState<UpdaterState | null>(null);
  const [isUpdateActionBusy, setIsUpdateActionBusy] = useState(false);

  useEffect(() => {
    if (!updater) return;

    let active = true;
    updater
      .getState()
      .then((state) => {
        if (active) setUpdateState(state);
      })
      .catch(() => {
        if (active) {
          setUpdateState({
            stage: 'error',
            message: 'Failed to load updater status.',
            currentVersion: 'unknown',
          });
        }
      });

    const unsubscribe = updater.onStateChange((nextState) => {
      setUpdateState(nextState);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [updater]);

  const updateButtonLabel = useMemo(() => {
    if (!updater) return 'Desktop only';
    if (isUpdateActionBusy) return 'Working...';

    if (updateState?.stage === 'downloaded') return 'Restart to Install';
    if (updateState?.stage === 'checking') return 'Checking...';
    if (updateState?.stage === 'available' || updateState?.stage === 'downloading') return 'Downloading...';
    return 'One-click Update';
  }, [isUpdateActionBusy, updateState?.stage, updater]);

  const isUpdateButtonDisabled =
    !updater
    || isUpdateActionBusy
    || updateState?.stage === 'checking'
    || updateState?.stage === 'available'
    || updateState?.stage === 'downloading';

  const handleUpdateAction = async () => {
    if (!updater || isUpdateActionBusy) return;

    setIsUpdateActionBusy(true);
    try {
      if (updateState?.stage === 'downloaded') {
        await updater.quitAndInstall();
      } else {
        await updater.checkForUpdates();
      }
    } finally {
      setIsUpdateActionBusy(false);
    }
  };

  const updateProgressText = useMemo(() => {
    if (updateState?.stage !== 'downloading') return null;
    if (typeof updateState.percent !== 'number') return 'Downloading update...';

    const transferredMb = updateState.transferred ? (updateState.transferred / (1024 * 1024)).toFixed(1) : null;
    const totalMb = updateState.total ? (updateState.total / (1024 * 1024)).toFixed(1) : null;
    const speedPart = transferredMb && totalMb ? ` (${transferredMb}MB / ${totalMb}MB)` : '';
    return `${updateState.percent.toFixed(0)}%${speedPart}`;
  }, [updateState]);

  return (
    <>
      <div className="settings-section">
        <label className="settings-label">About</label>
        <p className="settings-hint">
          Codeye v{updateState?.currentVersion || '0.3.0'} — A desktop GUI for Claude Code.
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

      {window.electronAPI && (
        <div className="settings-section">
          <label className="settings-label">Updates</label>
          <div className="settings-update-row">
            <div className="settings-update-meta">
              <span className="settings-hint">{updateState?.message || 'Ready to check for updates.'}</span>
              {updateProgressText && (
                <span className="settings-hint">{updateProgressText}</span>
              )}
            </div>
            <button
              className="settings-browse-btn settings-update-btn"
              onClick={handleUpdateAction}
              disabled={isUpdateButtonDisabled}
            >
              {updateButtonLabel}
            </button>
          </div>
        </div>
      )}

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
