import { useEffect, useMemo, useState } from 'react';

interface UpdaterState {
  stage: string;
  message?: string;
  currentVersion?: string;
  latestVersion?: string;
  percent?: number;
  transferred?: number;
  total?: number;
}

export default function AboutTab() {
  const updater = window.electronAPI?.updater;

  const [updateState, setUpdateState] = useState<UpdaterState | null>(null);
  const [isUpdateActionBusy, setIsUpdateActionBusy] = useState(false);

  useEffect(() => {
    if (!updater) return;

    let active = true;
    updater
      .getState()
      .then((state: UpdaterState) => {
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

    const unsubscribe = updater.onStateChange((nextState: UpdaterState) => {
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

    if (updateState?.stage === 'unsupported') return 'Download Latest';
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
      if (updateState?.stage === 'unsupported') {
        await updater.openLatestRelease();
      } else if (updateState?.stage === 'downloaded') {
        const willInstall = await updater.quitAndInstall();
        if (!willInstall) {
          setUpdateState((prev) => ({
            stage: 'error',
            message: 'Update is not ready to install yet. Please check again.',
            currentVersion: prev?.currentVersion || 'unknown',
            latestVersion: prev?.latestVersion,
          }));
        }
      } else {
        setUpdateState((prev) => ({
          stage: 'checking',
          message: 'Checking for updates...',
          currentVersion: prev?.currentVersion || 'unknown',
          latestVersion: prev?.latestVersion,
          percent: prev?.percent,
          transferred: prev?.transferred,
          total: prev?.total,
        }));
        const nextState = await updater.checkForUpdates();
        setUpdateState(nextState);
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

  const updateMessage = updateProgressText ?? updateState?.message ?? 'Ready to check for updates.';

  return (
    <div className="settings-section settings-update-only">
      <button
        className="settings-browse-btn settings-update-btn"
        onClick={handleUpdateAction}
        disabled={isUpdateButtonDisabled}
      >
        {updateButtonLabel}
      </button>
      <span className="settings-hint">{updater ? updateMessage : 'Desktop app required for updates.'}</span>
    </div>
  );
}
