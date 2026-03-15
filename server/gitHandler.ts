import { spawnSync } from 'child_process';
import type {
  GitFileStatus,
  GitStatusPayload,
  GitDiffStatPayload,
  GitDiffStatFile,
  GitCommitResultPayload,
  GitPushResultPayload,
  GitPrResultPayload,
  GitOperationStatusPayload,
} from '../src/types/git';
import type { ErrorPayload } from '../src/types/featureFlags';

export const GIT_COMMAND_TIMEOUT_MS = 5000;
export const GIT_WRITE_TIMEOUT_MS = 30000;

const NON_GIT_RE = /not a git repository/i;

export interface GitWriteRequest {
  action: 'commit' | 'push' | 'pr';
  cwd: string;
  operationId: string;
  message?: string;
  remote?: string;
  branch?: string;
  title?: string;
  body?: string;
  base?: string;
  head?: string;
}

export interface GitWriteResult {
  operationId: string;
  success: boolean;
  hash?: string;
  message?: string;
  remote?: string;
  branch?: string;
  commits?: number;
  url?: string;
  number?: number;
  manualCommand?: string;
  error?: ErrorPayload;
}

interface OperationRecord {
  operationId: string;
  status: 'pending' | 'success' | 'error';
  result: GitWriteResult;
  updatedAt: number;
}

const MAX_TOMBSTONE_SIZE = 200;
const operationCache = new Map<string, OperationRecord>();
const cwdLocks = new Map<string, string>();

function evictOldestTombstones() {
  if (operationCache.size <= MAX_TOMBSTONE_SIZE) return;
  const entries = [...operationCache.entries()].sort(
    (a, b) => a[1].updatedAt - b[1].updatedAt
  );
  const toRemove = entries.slice(0, entries.length - MAX_TOMBSTONE_SIZE);
  for (const [key] of toRemove) {
    operationCache.delete(key);
  }
}

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

export function parseDiffStatOutput(stdout: string): GitDiffStatPayload {
  const lines = stdout.split('\n').filter((l) => l.trim());
  const files: GitDiffStatFile[] = [];

  for (const line of lines) {
    const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!match) continue;
    const insertions = match[1] === '-' ? 0 : parseInt(match[1], 10);
    const deletions = match[2] === '-' ? 0 : parseInt(match[2], 10);
    files.push({ path: match[3], insertions, deletions });
  }

  return {
    files,
    summary: {
      filesChanged: files.length,
      insertions: files.reduce((sum, f) => sum + f.insertions, 0),
      deletions: files.reduce((sum, f) => sum + f.deletions, 0),
    },
  };
}

export function getDiffStat(cwd: string): GitDiffStatPayload {
  const staged = spawnSync(
    'git',
    ['-C', cwd, 'diff', '--cached', '--numstat'],
    { encoding: 'utf8', timeout: GIT_COMMAND_TIMEOUT_MS }
  );

  if (staged.error || (staged.status !== null && staged.status !== 0)) {
    return { files: [], summary: { filesChanged: 0, insertions: 0, deletions: 0 } };
  }

  return parseDiffStatOutput((staged.stdout || '').toString());
}

function makeError(code: string, message: string, retryable = false): ErrorPayload {
  return { code, message, retryable };
}

function executeCommit(req: GitWriteRequest): GitWriteResult {
  const { cwd, operationId } = req;
  let { message } = req;

  const statusCheck = spawnSync(
    'git',
    ['-C', cwd, 'diff', '--cached', '--quiet'],
    { encoding: 'utf8', timeout: GIT_COMMAND_TIMEOUT_MS }
  );
  if (statusCheck.status === 0) {
    return {
      operationId,
      success: false,
      error: makeError('NOTHING_TO_COMMIT', 'No staged changes to commit'),
    };
  }

  if (!message) {
    message = generateCommitMessage(getDiffStat(cwd));
  }

  const result = spawnSync(
    'git',
    ['-C', cwd, 'commit', '-m', message],
    { encoding: 'utf8', timeout: GIT_WRITE_TIMEOUT_MS }
  );

  if (result.error || (result.status !== null && result.status !== 0)) {
    const stderr = (result.stderr || '').toString().trim();
    return {
      operationId,
      success: false,
      error: makeError('COMMIT_FAILED', stderr || 'git commit failed'),
    };
  }

  const hashResult = spawnSync(
    'git',
    ['-C', cwd, 'rev-parse', '--short', 'HEAD'],
    { encoding: 'utf8', timeout: GIT_COMMAND_TIMEOUT_MS }
  );
  const hash = (hashResult.stdout || '').toString().trim();

  return {
    operationId,
    success: true,
    hash,
    message,
  };
}

function executePush(req: GitWriteRequest): GitWriteResult {
  const { cwd, operationId, remote = 'origin', branch } = req;
  const args = ['-C', cwd, 'push'];
  if (remote) args.push(remote);
  if (branch) args.push(branch);

  const result = spawnSync('git', args, {
    encoding: 'utf8',
    timeout: GIT_WRITE_TIMEOUT_MS,
  });

  if (result.error || (result.status !== null && result.status !== 0)) {
    const stderr = (result.stderr || '').toString().trim();
    return {
      operationId,
      success: false,
      error: makeError('PUSH_FAILED', stderr || 'git push failed', true),
    };
  }

  return {
    operationId,
    success: true,
    remote: remote || 'origin',
    branch: branch || undefined,
  };
}

function executePr(req: GitWriteRequest): GitWriteResult {
  const { cwd, operationId, title, body, base, head } = req;
  const args = ['-C', cwd, 'pr', 'create'];
  if (title) { args.push('--title', title); }
  if (body) { args.push('--body', body); }
  if (base) { args.push('--base', base); }
  if (head) { args.push('--head', head); }

  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    timeout: GIT_WRITE_TIMEOUT_MS,
  });

  if (result.error || (result.status !== null && result.status !== 0)) {
    const stderr = (result.stderr || '').toString().trim();
    const branchResult = spawnSync('git', ['-C', cwd, 'branch', '--show-current'], {
      encoding: 'utf8',
      timeout: GIT_COMMAND_TIMEOUT_MS,
    });
    const currentBranch = (branchResult.stdout || '').toString().trim();
    const manualCmd = `gh pr create --title "${title || ''}" --head "${head || currentBranch}"`;

    return {
      operationId,
      success: false,
      manualCommand: manualCmd,
      error: makeError('PR_FAILED', stderr || 'gh pr create failed'),
    };
  }

  const stdout = (result.stdout || '').toString().trim();
  const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+\/pull\/(\d+)/);

  return {
    operationId,
    success: true,
    url: urlMatch ? urlMatch[0] : stdout,
    number: urlMatch ? parseInt(urlMatch[1], 10) : undefined,
  };
}

export async function handleGitWriteRequest(
  req: GitWriteRequest
): Promise<GitWriteResult> {
  const { operationId, cwd } = req;

  const existing = operationCache.get(operationId);
  if (existing && existing.status !== 'pending') {
    return existing.result;
  }

  if (cwdLocks.has(cwd) && cwdLocks.get(cwd) !== operationId) {
    return {
      operationId,
      success: false,
      error: makeError('LOCK_CONFLICT', 'Another git operation is in progress for this directory', true),
    };
  }

  cwdLocks.set(cwd, operationId);
  operationCache.set(operationId, {
    operationId,
    status: 'pending',
    result: { operationId, success: false },
    updatedAt: Date.now(),
  });

  try {
    let result: GitWriteResult;
    switch (req.action) {
      case 'commit':
        result = executeCommit(req);
        break;
      case 'push':
        result = executePush(req);
        break;
      case 'pr':
        result = executePr(req);
        break;
    }

    const record: OperationRecord = {
      operationId,
      status: result.success ? 'success' : 'error',
      result,
      updatedAt: Date.now(),
    };
    operationCache.set(operationId, record);
    evictOldestTombstones();

    return result;
  } finally {
    cwdLocks.delete(cwd);
  }
}

export function getOperationStatus(
  operationId: string
): GitOperationStatusPayload | null {
  const record = operationCache.get(operationId);
  if (!record) return null;

  return {
    operationId: record.operationId,
    status: record.status === 'pending' ? 'pending' : record.status,
    updatedAt: record.updatedAt,
    error: record.result.error,
  };
}

export function executeGitAdd(cwd: string): { success: boolean; error?: ErrorPayload } {
  const result = spawnSync('git', ['-C', cwd, 'add', '-A'], {
    encoding: 'utf8',
    timeout: GIT_COMMAND_TIMEOUT_MS,
  });
  if (result.error || (result.status !== null && result.status !== 0)) {
    const stderr = (result.stderr || '').toString().trim();
    return { success: false, error: makeError('ADD_FAILED', stderr || 'git add failed') };
  }
  return { success: true };
}

export function generateCommitMessage(diffStat: { summary: { filesChanged: number; insertions: number; deletions: number } }): string {
  const { summary } = diffStat;
  const fileWord = summary.filesChanged === 1 ? '1 file' : `${summary.filesChanged} files`;
  const parts = [`update ${fileWord}`];
  if (summary.insertions > 0) parts.push(`+${summary.insertions}`);
  if (summary.deletions > 0) parts.push(`-${summary.deletions}`);
  return `chore: ${parts.join(' ')}`;
}

export function resetWriteStateForTests(): void {
  operationCache.clear();
  cwdLocks.clear();
}

export function acquireLockForTests(cwd: string, operationId: string): void {
  cwdLocks.set(cwd, operationId);
}
