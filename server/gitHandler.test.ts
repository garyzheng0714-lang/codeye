import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GIT_COMMAND_TIMEOUT_MS,
  getGitStatusSnapshot,
  parsePorcelainStatus,
  parseDiffStatOutput,
  getDiffStat,
  handleGitWriteRequest,
  getOperationStatus,
  resetWriteStateForTests,
  GIT_WRITE_TIMEOUT_MS,
} from './gitHandler';
import type { GitWriteRequest, GitWriteResult } from './gitHandler';

const tempRoots: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

function makeGitRepo(): string {
  const dir = makeTempDir('codeye-git-repo-');
  const { execSync } = require('child_process');
  execSync('git init', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' });
  fs.writeFileSync(path.join(dir, 'file.txt'), 'hello');
  execSync('git add . && git commit -m "init"', { cwd: dir, stdio: 'ignore' });
  return dir;
}

afterEach(() => {
  resetWriteStateForTests();
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (!root) continue;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('gitHandler — read path', () => {
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

describe('gitHandler — diff stat', () => {
  it('parses numstat output into file-level stats', () => {
    const output = '10\t3\tsrc/main.ts\n5\t0\tREADME.md\n';
    const result = parseDiffStatOutput(output);
    expect(result.files).toEqual([
      { path: 'src/main.ts', insertions: 10, deletions: 3 },
      { path: 'README.md', insertions: 5, deletions: 0 },
    ]);
    expect(result.summary).toEqual({
      filesChanged: 2,
      insertions: 15,
      deletions: 3,
    });
  });

  it('returns empty result for empty output', () => {
    const result = parseDiffStatOutput('');
    expect(result.files).toEqual([]);
    expect(result.summary.filesChanged).toBe(0);
  });

  it('gets diff stat from a real git repo with staged changes', () => {
    const dir = makeGitRepo();
    fs.writeFileSync(path.join(dir, 'file.txt'), 'hello world\nnew line\n');
    const { execSync } = require('child_process');
    execSync('git add .', { cwd: dir, stdio: 'ignore' });

    const result = getDiffStat(dir);
    expect(result.summary.filesChanged).toBeGreaterThanOrEqual(1);
  });
});

describe('gitHandler — write core', () => {
  it('exposes write timeout constant', () => {
    expect(GIT_WRITE_TIMEOUT_MS).toBe(30000);
  });

  it('commits staged changes in a real git repo', async () => {
    const dir = makeGitRepo();
    fs.writeFileSync(path.join(dir, 'file.txt'), 'changed content\n');
    const { execSync } = require('child_process');
    execSync('git add .', { cwd: dir, stdio: 'ignore' });

    const operationId = crypto.randomUUID();
    const result = await handleGitWriteRequest({
      action: 'commit',
      cwd: dir,
      operationId,
      message: 'test commit',
    });

    expect(result.success).toBe(true);
    expect(result.operationId).toBe(operationId);
    expect(result.hash).toBeDefined();
    expect(typeof result.hash).toBe('string');
    expect(result.hash!.length).toBeGreaterThan(0);
  });

  it('returns LOCK_CONFLICT when lock is held for same cwd', async () => {
    const dir = makeGitRepo();
    const op1 = crypto.randomUUID();
    const op2 = crypto.randomUUID();

    // Manually acquire lock to simulate in-progress operation
    const { acquireLockForTests } = await import('./gitHandler');
    acquireLockForTests(dir, op1);

    const result2 = await handleGitWriteRequest({
      action: 'commit',
      cwd: dir,
      operationId: op2,
      message: 'second',
    });

    expect(result2.success).toBe(false);
    expect(result2.error?.code).toBe('LOCK_CONFLICT');
    expect(result2.error?.retryable).toBe(true);
  });

  it('returns cached result for duplicate operationId', async () => {
    const dir = makeGitRepo();
    fs.writeFileSync(path.join(dir, 'file.txt'), 'dup test\n');
    const { execSync } = require('child_process');
    execSync('git add .', { cwd: dir, stdio: 'ignore' });

    const operationId = crypto.randomUUID();
    const result1 = await handleGitWriteRequest({
      action: 'commit',
      cwd: dir,
      operationId,
      message: 'dup commit',
    });
    expect(result1.success).toBe(true);

    const result2 = await handleGitWriteRequest({
      action: 'commit',
      cwd: dir,
      operationId,
      message: 'dup commit',
    });
    expect(result2.success).toBe(true);
    expect(result2.hash).toBe(result1.hash);
  });

  it('reports error for commit with nothing staged', async () => {
    const dir = makeGitRepo();
    const operationId = crypto.randomUUID();

    const result = await handleGitWriteRequest({
      action: 'commit',
      cwd: dir,
      operationId,
      message: 'empty commit',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOTHING_TO_COMMIT');
  });

  it('returns operation status for completed operations', async () => {
    const dir = makeGitRepo();
    fs.writeFileSync(path.join(dir, 'file.txt'), 'status test\n');
    const { execSync } = require('child_process');
    execSync('git add .', { cwd: dir, stdio: 'ignore' });

    const operationId = crypto.randomUUID();
    await handleGitWriteRequest({
      action: 'commit',
      cwd: dir,
      operationId,
      message: 'status test',
    });

    const status = getOperationStatus(operationId);
    expect(status).not.toBeNull();
    expect(status!.status).toBe('success');
    expect(status!.operationId).toBe(operationId);
  });

  it('returns null status for unknown operationId', () => {
    const status = getOperationStatus(crypto.randomUUID());
    expect(status).toBeNull();
  });
});
