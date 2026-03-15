import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GIT_COMMAND_TIMEOUT_MS,
  getGitStatusSnapshot,
  parsePorcelainStatus,
} from './gitHandler';

const tempRoots: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (!root) continue;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('gitHandler', () => {
  it('parses branch, ahead/behind and dirty files from porcelain v2', () => {
    const status = parsePorcelainStatus(
      [
        '# branch.oid 2f8e7dd9cb',
        '# branch.head main',
        '# branch.ab +2 -1',
        '1 M. N... 100644 100644 100644 a1b2c3d4 a1b2c3d4 src/main.ts',
        '? README.md',
      ].join('\n')
    );

    expect(status.branch).toBe('main');
    expect(status.ahead).toBe(2);
    expect(status.behind).toBe(1);
    expect(status.dirty).toBe(true);
    expect(status.files).toEqual([
      { path: 'src/main.ts', status: 'M' },
      { path: 'README.md', status: '?' },
    ]);
  });

  it('returns available=false for non-git directories', () => {
    const cwd = makeTempDir('codeye-not-git-');
    const status = getGitStatusSnapshot(cwd);
    expect(status.available).toBe(false);
    expect(status.branch).toBeNull();
    expect(status.dirty).toBe(false);
  });

  it('exposes 5s timeout constant for status command', () => {
    expect(GIT_COMMAND_TIMEOUT_MS).toBe(5000);
  });
});
