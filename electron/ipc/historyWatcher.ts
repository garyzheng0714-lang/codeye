import fs from 'fs';
import path from 'path';
import os from 'os';
import { BrowserWindow } from 'electron';

const DEBOUNCE_MS = 2000;
const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

interface WatcherEntry {
  watcher: fs.FSWatcher;
  folderPath: string;
  encodedPath: string;
}

const watchers = new Map<string, WatcherEntry>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows[0] ?? null;
}

function notifyRenderer(encodedPath: string) {
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return;
  win.webContents.send('projects:history-changed', encodedPath);
}

function debouncedNotify(encodedPath: string) {
  const existing = debounceTimers.get(encodedPath);
  if (existing) clearTimeout(existing);
  debounceTimers.set(
    encodedPath,
    setTimeout(() => {
      debounceTimers.delete(encodedPath);
      notifyRenderer(encodedPath);
    }, DEBOUNCE_MS),
  );
}

export function watchProjectHistory(folderPath: string, encodedPath: string): void {
  if (watchers.has(encodedPath)) return;

  const projectDir = path.join(PROJECTS_DIR, encodedPath);
  try {
    if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) return;
  } catch {
    return;
  }

  try {
    const watcher = fs.watch(projectDir, { persistent: false }, (_eventType, filename) => {
      if (filename && filename.endsWith('.jsonl')) {
        debouncedNotify(encodedPath);
      }
    });

    watcher.on('error', () => {
      unwatchProjectHistory(encodedPath);
    });

    watchers.set(encodedPath, { watcher, folderPath, encodedPath });
  } catch {
    // directory may not be watchable
  }
}

export function unwatchProjectHistory(encodedPath: string): void {
  const entry = watchers.get(encodedPath);
  if (!entry) return;
  try {
    entry.watcher.close();
  } catch {
    /* ignore */
  }
  watchers.delete(encodedPath);
  const timer = debounceTimers.get(encodedPath);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(encodedPath);
  }
}

export function unwatchAll(): void {
  for (const [key] of watchers) {
    unwatchProjectHistory(key);
  }
}
