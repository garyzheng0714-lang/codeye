import type { IpcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

interface FileTreeEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

const ALWAYS_IGNORE = new Set([
  '.git',
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
]);

const FALLBACK_IGNORE = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '__pycache__',
  '.cache',
  '.parcel-cache',
  'coverage',
  '.turbo',
  '.vercel',
  '.output',
]);

function filterWithGit(dirPath: string, names: string[]): Set<string> {
  if (names.length === 0) return new Set();

  const fullPaths = names.map((n) => path.join(dirPath, n));
  try {
    const result = spawnSync('git', ['check-ignore', '--stdin'], {
      input: fullPaths.join('\n'),
      cwd: dirPath,
      encoding: 'utf-8',
      timeout: 3000,
    });

    if (result.status === null || result.error) {
      return new Set();
    }

    const ignored = new Set<string>();
    if (result.stdout) {
      for (const line of result.stdout.trim().split('\n')) {
        if (line) ignored.add(path.basename(line));
      }
    }
    return ignored;
  } catch {
    return new Set();
  }
}

function isGitRepo(dirPath: string): boolean {
  try {
    const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: dirPath,
      encoding: 'utf-8',
      timeout: 2000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function sortEntries(entries: FileTreeEntry[]): FileTreeEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

export function registerFileTreeHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('filetree:read-dir', (_event, args: { dirPath: string }) => {
    const { dirPath } = args;

    try {
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) return [];
    } catch {
      return [];
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }

    const names = entries
      .filter((e) => !ALWAYS_IGNORE.has(e.name) && !e.name.startsWith('._'))
      .map((e) => e.name);

    let ignoredNames: Set<string>;
    if (isGitRepo(dirPath)) {
      ignoredNames = filterWithGit(dirPath, names);
    } else {
      ignoredNames = FALLBACK_IGNORE;
    }

    const result: FileTreeEntry[] = [];
    for (const entry of entries) {
      if (ALWAYS_IGNORE.has(entry.name)) continue;
      if (entry.name.startsWith('._')) continue;
      if (ignoredNames.has(entry.name)) continue;

      result.push({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
      });
    }

    return sortEntries(result);
  });
}
