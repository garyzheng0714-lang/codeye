import { spawnSync } from 'child_process';
import type { GitFileStatus, GitStatusPayload } from '../src/types/git';

export const GIT_COMMAND_TIMEOUT_MS = 5000;

const NON_GIT_RE = /not a git repository/i;

const EMPTY_STATUS: GitStatusPayload = {
  available: false,
  branch: null,
  dirty: false,
  ahead: 0,
  behind: 0,
  files: [],
};

function toPrimaryStatus(xy: string): string {
  const first = xy[0];
  const second = xy[1];
  if (first && first !== '.') return first;
  if (second && second !== '.') return second;
  return '?';
}

function extractPath(line: string): string {
  const tabIndex = line.lastIndexOf('\t');
  if (tabIndex >= 0) {
    return line.slice(tabIndex + 1).trim();
  }

  const parts = line.trim().split(/\s+/);
  return parts.at(-1) ?? '';
}

function parseTrackedFile(line: string): GitFileStatus | null {
  const marker = line[0];
  if (marker !== '1' && marker !== '2' && marker !== 'u') return null;

  const statusToken = line.slice(2).trim().split(/\s+/)[0] ?? '..';
  const path = extractPath(line);
  if (!path) return null;

  return {
    path,
    status: toPrimaryStatus(statusToken),
  };
}

export function parsePorcelainStatus(stdout: string): GitStatusPayload {
  const lines = stdout.split('\n');
  let branch: string | null = null;
  let ahead = 0;
  let behind = 0;
  const files: GitFileStatus[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;

    if (line.startsWith('# branch.head ')) {
      const value = line.slice('# branch.head '.length).trim();
      branch = value === '(detached)' ? null : value;
      continue;
    }

    if (line.startsWith('# branch.ab ')) {
      const match = line.match(/^# branch\.ab \+(\d+) -(\d+)$/);
      if (match) {
        ahead = Number.parseInt(match[1], 10);
        behind = Number.parseInt(match[2], 10);
      }
      continue;
    }

    if (line.startsWith('? ')) {
      files.push({
        path: line.slice(2).trim(),
        status: '?',
      });
      continue;
    }

    if (line.startsWith('! ')) {
      files.push({
        path: line.slice(2).trim(),
        status: '!',
      });
      continue;
    }

    const tracked = parseTrackedFile(line);
    if (tracked) files.push(tracked);
  }

  return {
    available: true,
    branch,
    dirty: files.length > 0,
    ahead,
    behind,
    files,
  };
}

export function getGitStatusSnapshot(cwd: string): GitStatusPayload {
  const result = spawnSync(
    'git',
    ['-C', cwd, 'status', '--porcelain=2', '--branch'],
    {
      encoding: 'utf8',
      timeout: GIT_COMMAND_TIMEOUT_MS,
    }
  );

  if (result.error) {
    return { ...EMPTY_STATUS };
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    const stderr = (result.stderr || '').toString();
    if (NON_GIT_RE.test(stderr)) {
      return { ...EMPTY_STATUS };
    }
    return { ...EMPTY_STATUS };
  }

  return parsePorcelainStatus((result.stdout || '').toString());
}
