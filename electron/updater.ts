import { app, type BrowserWindow, type IpcMain } from 'electron';
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater';

type UpdaterStage =
  | 'idle'
  | 'unsupported'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error';

interface UpdaterState {
  stage: UpdaterStage;
  message: string;
  currentVersion: string;
  latestVersion?: string;
  percent?: number;
  transferred?: number;
  total?: number;
}

const UPDATER_EVENT_CHANNEL = 'updater:state';
const unsupportedMessage = 'Auto update is only available in packaged desktop builds.';

let state: UpdaterState = {
  stage: 'idle',
  message: 'Ready to check for updates.',
  currentVersion: app.getVersion(),
};
let isChecking = false;
let handlersBound = false;
let getMainWindow: (() => BrowserWindow | null) | null = null;

function isUpdaterSupported(): boolean {
  return app.isPackaged;
}

function buildState(
  stage: UpdaterStage,
  message: string,
  extra: Partial<Omit<UpdaterState, 'stage' | 'message' | 'currentVersion'>> = {}
): UpdaterState {
  return {
    stage,
    message,
    currentVersion: app.getVersion(),
    ...extra,
  };
}

function publishState(nextState: UpdaterState): void {
  state = nextState;
  const win = getMainWindow?.();
  if (win && !win.isDestroyed()) {
    win.webContents.send(UPDATER_EVENT_CHANNEL, state);
  }
}

function setUpdaterState(
  stage: UpdaterStage,
  message: string,
  extra: Partial<Omit<UpdaterState, 'stage' | 'message' | 'currentVersion'>> = {}
): UpdaterState {
  const next = buildState(stage, message, extra);
  publishState(next);
  return next;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown update error';
}

function mapCheckErrorMessage(error: unknown): string {
  const raw = stringifyError(error);
  const lower = raw.toLowerCase();

  if (lower.includes('404') || lower.includes('not found')) {
    return 'No published GitHub Release was found. Please publish a new release first.';
  }
  if (lower.includes('latest') && lower.includes('release')) {
    return 'No latest release is available yet. Publish a versioned release to enable updates.';
  }
  return `Unable to check for updates: ${raw}`;
}

function bindUpdaterEvents(): void {
  if (handlersBound) return;
  handlersBound = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    setUpdaterState('checking', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    const latestVersion = info.version;
    setUpdaterState('available', `Update ${latestVersion} found. Downloading...`, { latestVersion });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    setUpdaterState('downloading', `Downloading update... ${Math.round(progress.percent)}%`, {
      latestVersion: state.latestVersion,
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    const latestVersion = info.version;
    isChecking = false;
    setUpdaterState('downloaded', `Update ${latestVersion} is ready. Restart to install.`, { latestVersion, percent: 100 });
  });

  autoUpdater.on('update-not-available', () => {
    isChecking = false;
    setUpdaterState('not-available', `You're up to date (v${app.getVersion()}).`, { percent: undefined });
  });

  autoUpdater.on('error', (error) => {
    isChecking = false;
    setUpdaterState('error', `Update failed: ${stringifyError(error)}`);
  });
}

export function registerUpdaterHandlers(
  ipcMain: IpcMain,
  mainWindowGetter: () => BrowserWindow | null
): void {
  getMainWindow = mainWindowGetter;
  bindUpdaterEvents();

  ipcMain.handle('updater:get-state', () => {
    if (!isUpdaterSupported()) {
      return setUpdaterState('unsupported', unsupportedMessage);
    }
    return state;
  });

  ipcMain.handle('updater:check-for-updates', async () => {
    if (!isUpdaterSupported()) {
      return setUpdaterState('unsupported', unsupportedMessage);
    }
    if (isChecking) return state;

    try {
      isChecking = true;
      setUpdaterState('checking', 'Checking for updates...');
      await autoUpdater.checkForUpdates();
      return state;
    } catch (error) {
      isChecking = false;
      return setUpdaterState('error', mapCheckErrorMessage(error));
    }
  });

  ipcMain.handle('updater:quit-and-install', () => {
    if (!isUpdaterSupported()) return false;
    if (state.stage !== 'downloaded') return false;

    setImmediate(() => {
      autoUpdater.quitAndInstall();
    });
    return true;
  });
}
