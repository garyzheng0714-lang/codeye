import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { app, shell, type BrowserWindow, type IpcMain } from 'electron';
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
const macSignatureUnsupportedMessage =
  'In-app install requires a Developer ID signed macOS build. Current app is ad-hoc signed. Use Download Latest instead.';
const latestReleaseUrl = 'https://github.com/garyzheng0714-lang/codeye/releases/latest';

let state: UpdaterState = {
  stage: 'idle',
  message: 'Ready to check for updates.',
  currentVersion: app.getVersion(),
};
let isChecking = false;
let handlersBound = false;
let getMainWindow: (() => BrowserWindow | null) | null = null;
let supportsInAppInstallCache: boolean | null = null;

function isUpdaterSupported(): boolean {
  return app.isPackaged;
}

function hasMacInstallCompatibleSignature(): boolean {
  if (supportsInAppInstallCache !== null) return supportsInAppInstallCache;
  if (process.platform !== 'darwin') {
    supportsInAppInstallCache = true;
    return true;
  }

  const appBundlePath = path.resolve(process.execPath, '../../..');
  const result = spawnSync('codesign', ['-dv', '--verbose=4', appBundlePath], { encoding: 'utf8' });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const isAdhoc = /Signature=adhoc/i.test(output);
  const teamNotSet = /TeamIdentifier=not set/i.test(output);
  supportsInAppInstallCache = !isAdhoc && !teamNotSet;
  return supportsInAppInstallCache;
}

function getUnsupportedReason(): string | null {
  if (!isUpdaterSupported()) return unsupportedMessage;
  if (!hasMacInstallCompatibleSignature()) return macSignatureUnsupportedMessage;
  return null;
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
  if (lower.includes('did not pass validation') || lower.includes('code signature')) {
    return 'Update package failed macOS signature validation. Use Download Latest, or publish Developer ID signed builds.';
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
    const unsupportedReason = getUnsupportedReason();
    if (unsupportedReason) {
      return setUpdaterState('unsupported', unsupportedReason);
    }
    return state;
  });

  ipcMain.handle('updater:check-for-updates', async () => {
    const unsupportedReason = getUnsupportedReason();
    if (unsupportedReason) {
      return setUpdaterState('unsupported', unsupportedReason);
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
    if (getUnsupportedReason()) return false;
    if (state.stage !== 'downloaded') return false;

    setImmediate(() => {
      autoUpdater.quitAndInstall();
    });
    return true;
  });

  ipcMain.handle('updater:open-latest-release', async () => {
    await shell.openExternal(latestReleaseUrl);
    return true;
  });
}
