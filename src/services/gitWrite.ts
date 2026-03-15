import { sendMessage } from './websocket';

export type GitWriteAction = 'commit' | 'push' | 'pr';

export interface GitWritePendingOperation {
  action: GitWriteAction;
  operationId: string;
  correlationId: string;
  cwd: string;
  startedAt: number;
}

export interface GitWriteCompletedResult {
  action: GitWriteAction;
  operationId: string;
  success: boolean;
  hash?: string;
  message?: string;
  remote?: string;
  branch?: string;
  url?: string;
  number?: number;
  manualCommand?: string;
  error?: { code: string; message: string; retryable?: boolean };
}

type ResultCallback = (result: GitWriteCompletedResult) => void;

const pendingOps = new Map<string, GitWritePendingOperation>();
const resultCallbacks = new Map<string, ResultCallback>();

async function createWorkspaceFingerprint(
  workspaceRoot: string,
  cwd: string
): Promise<string> {
  const source = `${workspaceRoot}\n${cwd}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(source);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeWorkspacePath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '/') return trimmed;
  return trimmed.replace(/[\\/]+$/, '');
}

export function buildGitWritePayload(params: {
  action: GitWriteAction;
  cwd: string;
  operationId: string;
  correlationId: string;
  requestId: string;
  workspaceFingerprint: string;
  message?: string;
  remote?: string;
  branch?: string;
  title?: string;
  body?: string;
  base?: string;
  head?: string;
}): {
  version: number;
  type: string;
  correlationId: string;
  payload: Record<string, unknown>;
} {
  const normalizedCwd = normalizeWorkspacePath(params.cwd);
  const workspaceRoot = normalizedCwd;

  const typeMap: Record<GitWriteAction, string> = {
    commit: 'git_commit_request',
    push: 'git_push_request',
    pr: 'git_pr_request',
  };

  const base: Record<string, unknown> = {
    requestId: params.requestId,
    cwd: normalizedCwd,
    workspaceRoot,
    workspaceFingerprint: params.workspaceFingerprint,
    operationId: params.operationId,
  };

  if (params.action === 'commit') {
    base.message = params.message ?? '';
  } else if (params.action === 'push') {
    if (params.remote) base.remote = params.remote;
    if (params.branch) base.branch = params.branch;
  } else if (params.action === 'pr') {
    if (params.title) base.title = params.title;
    if (params.body) base.body = params.body;
    if (params.base) base.base = params.base;
    if (params.head) base.head = params.head;
  }

  return {
    version: 1,
    type: typeMap[params.action],
    correlationId: params.correlationId,
    payload: base,
  };
}

export async function sendGitWriteRequest(params: {
  action: GitWriteAction;
  cwd: string;
  message?: string;
  remote?: string;
  branch?: string;
  title?: string;
  body?: string;
  base?: string;
  head?: string;
  onResult?: ResultCallback;
}): Promise<GitWritePendingOperation> {
  const operationId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const normalizedCwd = normalizeWorkspacePath(params.cwd);
  const workspaceFingerprint = await createWorkspaceFingerprint(
    normalizedCwd,
    normalizedCwd
  );

  const op: GitWritePendingOperation = {
    action: params.action,
    operationId,
    correlationId,
    cwd: normalizedCwd,
    startedAt: Date.now(),
  };

  pendingOps.set(correlationId, op);
  if (params.onResult) {
    resultCallbacks.set(correlationId, params.onResult);
  }

  const message = buildGitWritePayload({
    action: params.action,
    cwd: normalizedCwd,
    operationId,
    correlationId,
    requestId,
    workspaceFingerprint,
    message: params.message,
    remote: params.remote,
    branch: params.branch,
    title: params.title,
    body: params.body,
    base: params.base,
    head: params.head,
  });

  sendMessage(message as unknown as Record<string, unknown>);

  return op;
}

export function handleGitWriteResult(
  correlationId: string,
  action: GitWriteAction,
  resultPayload: Record<string, unknown>
): GitWriteCompletedResult | null {
  const op = pendingOps.get(correlationId);
  if (!op) return null;

  pendingOps.delete(correlationId);

  const result: GitWriteCompletedResult = {
    action,
    operationId: (resultPayload.operationId as string) || op.operationId,
    success: resultPayload.success as boolean,
    hash: resultPayload.hash as string | undefined,
    message: resultPayload.message as string | undefined,
    remote: resultPayload.remote as string | undefined,
    branch: resultPayload.branch as string | undefined,
    url: resultPayload.url as string | undefined,
    number: resultPayload.number as number | undefined,
    manualCommand: resultPayload.manualCommand as string | undefined,
    error: resultPayload.error as GitWriteCompletedResult['error'],
  };

  const callback = resultCallbacks.get(correlationId);
  if (callback) {
    resultCallbacks.delete(correlationId);
    callback(result);
  }

  return result;
}

export async function sendGitAddRequest(params: {
  cwd: string;
  all?: boolean;
}): Promise<{ correlationId: string; operationId: string }> {
  const operationId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const normalizedCwd = normalizeWorkspacePath(params.cwd);
  const workspaceFingerprint = await createWorkspaceFingerprint(
    normalizedCwd,
    normalizedCwd
  );

  sendMessage({
    version: 1,
    type: 'git_add_request',
    correlationId,
    payload: {
      requestId,
      cwd: normalizedCwd,
      workspaceRoot: normalizedCwd,
      workspaceFingerprint,
      operationId,
      all: params.all ?? true,
    },
  } as unknown as Record<string, unknown>);

  return { correlationId, operationId };
}

export function getPendingOperation(
  correlationId: string
): GitWritePendingOperation | undefined {
  return pendingOps.get(correlationId);
}

export function hasPendingOperations(): boolean {
  return pendingOps.size > 0;
}

export function clearPendingForTests(): void {
  pendingOps.clear();
  resultCallbacks.clear();
}
