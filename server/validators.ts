import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  gitCommitRequestPayloadSchema,
  gitDiffStatRequestPayloadSchema,
  gitOperationStatusRequestPayloadSchema,
  gitPrRequestPayloadSchema,
  gitPushRequestPayloadSchema,
  gitStatusRequestPayloadSchema,
} from '../src/types/git';

export interface QueryAttachment {
  id?: string;
  name: string;
  mimeType?: string;
  size?: number;
  dataBase64: string;
}

export interface QueryMessage {
  type: 'query';
  prompt: string;
  cwd?: string;
  mode?: string;
  model?: string;
  effort?: string;
  permissionMode?: string;
  sessionId?: string;
  attachments?: QueryAttachment[];
}

export function isQueryMessage(msg: unknown): msg is QueryMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>).type === 'query' &&
    typeof (msg as Record<string, unknown>).prompt === 'string'
  );
}

export function isStopMessage(msg: unknown): msg is { type: 'stop' } {
  return typeof msg === 'object' && msg !== null && (msg as Record<string, unknown>).type === 'stop';
}

export function isCheckAuthMessage(msg: unknown): msg is { type: 'check-auth' } {
  return typeof msg === 'object' && msg !== null && (msg as Record<string, unknown>).type === 'check-auth';
}

export const SESSION_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

const requestEnvelopeBaseSchema = z.object({
  version: z.literal(1),
  correlationId: z.uuid().optional(),
  type: z.string(),
  payload: z.unknown(),
});

const toolApprovalResponsePayloadSchema = z.object({
  approvalId: z.uuid(),
  decision: z.enum(['allow', 'deny']),
});

const gitStatusRequestEventSchema = requestEnvelopeBaseSchema.extend({
  type: z.literal('git_status_request'),
  payload: gitStatusRequestPayloadSchema,
});

const gitDiffStatRequestEventSchema = requestEnvelopeBaseSchema.extend({
  type: z.literal('git_diff_stat_request'),
  payload: gitDiffStatRequestPayloadSchema,
});

const gitCommitRequestEventSchema = requestEnvelopeBaseSchema.extend({
  type: z.literal('git_commit_request'),
  payload: gitCommitRequestPayloadSchema,
});

const gitPushRequestEventSchema = requestEnvelopeBaseSchema.extend({
  type: z.literal('git_push_request'),
  payload: gitPushRequestPayloadSchema,
});

const gitPrRequestEventSchema = requestEnvelopeBaseSchema.extend({
  type: z.literal('git_pr_request'),
  payload: gitPrRequestPayloadSchema,
});

const gitOperationStatusRequestEventSchema = requestEnvelopeBaseSchema.extend({
  type: z.literal('git_operation_status_request'),
  payload: gitOperationStatusRequestPayloadSchema,
});

const toolApprovalResponseEventSchema = requestEnvelopeBaseSchema.extend({
  type: z.literal('tool_approval_response'),
  payload: toolApprovalResponsePayloadSchema,
});

const clientRequestEventSchema = z.discriminatedUnion('type', [
  gitStatusRequestEventSchema,
  gitDiffStatRequestEventSchema,
  gitCommitRequestEventSchema,
  gitPushRequestEventSchema,
  gitPrRequestEventSchema,
  gitOperationStatusRequestEventSchema,
  toolApprovalResponseEventSchema,
]);

export type ClientRequestEvent = z.infer<typeof clientRequestEventSchema>;

type GitRequestEvent = Extract<
  ClientRequestEvent,
  {
    type:
      | 'git_status_request'
      | 'git_diff_stat_request'
      | 'git_commit_request'
      | 'git_push_request'
      | 'git_pr_request'
      | 'git_operation_status_request';
  }
>;

export interface RequestValidationContext {
  boundWorkspaceRoot?: string;
}

export interface ValidationErrorPayload {
  code:
    | 'INVALID_ENVELOPE'
    | 'INVALID_CWD'
    | 'OUTSIDE_WORKSPACE'
    | 'FINGERPRINT_MISMATCH'
    | 'WORKSPACE_CONTEXT_MISMATCH'
    | 'UNSUPPORTED_TYPE';
  message: string;
  field?: string;
  retryable: boolean;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ValidationErrorPayload };

const GIT_REQUEST_TYPES = new Set<GitRequestEvent['type']>([
  'git_status_request',
  'git_diff_stat_request',
  'git_commit_request',
  'git_push_request',
  'git_pr_request',
  'git_operation_status_request',
]);

function reject<T>(
  code: ValidationErrorPayload['code'],
  message: string,
  field?: string,
  retryable = false
): ValidationResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
      field,
      retryable,
    },
  };
}

function normalizeDirectory(raw: string): string | null {
  const resolved = path.resolve(raw);
  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) return null;
    return resolved;
  } catch {
    return null;
  }
}

function isPathInsideWorkspace(workspaceRoot: string, cwd: string): boolean {
  const relative = path.relative(workspaceRoot, cwd);
  if (!relative) return true;
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function createWorkspaceFingerprint(
  workspaceRoot: string,
  cwd: string
): string {
  const normalizedRoot = path.resolve(workspaceRoot);
  const normalizedCwd = path.resolve(cwd);
  return crypto
    .createHash('sha256')
    .update(`${normalizedRoot}\n${normalizedCwd}`)
    .digest('hex');
}

export function parseClientRequestEvent(msg: unknown): ClientRequestEvent | null {
  const parsed = clientRequestEventSchema.safeParse(msg);
  return parsed.success ? parsed.data : null;
}

export function validateGitRequestEvent(
  msg: unknown,
  context: RequestValidationContext = {}
): ValidationResult<GitRequestEvent> {
  const parsed = clientRequestEventSchema.safeParse(msg);
  if (!parsed.success) {
    return reject(
      'INVALID_ENVELOPE',
      'Request does not match StreamEvent v1 envelope'
    );
  }

  const event = parsed.data;
  if (!GIT_REQUEST_TYPES.has(event.type as GitRequestEvent['type'])) {
    return reject('UNSUPPORTED_TYPE', `Unsupported request type: ${event.type}`);
  }

  const normalizedRoot = normalizeDirectory(event.payload.workspaceRoot);
  if (!normalizedRoot) {
    return reject('INVALID_CWD', 'workspaceRoot is not a valid directory', 'workspaceRoot');
  }

  const normalizedCwd = normalizeDirectory(event.payload.cwd);
  if (!normalizedCwd) {
    return reject('INVALID_CWD', 'cwd is not a valid directory', 'cwd');
  }

  if (context.boundWorkspaceRoot) {
    const boundRoot = path.resolve(context.boundWorkspaceRoot);
    if (boundRoot !== normalizedRoot) {
      return reject(
        'WORKSPACE_CONTEXT_MISMATCH',
        'Request workspaceRoot does not match WebSocket-bound workspace'
      );
    }
  }

  if (!isPathInsideWorkspace(normalizedRoot, normalizedCwd)) {
    return reject(
      'OUTSIDE_WORKSPACE',
      'cwd must be inside workspaceRoot',
      'cwd'
    );
  }

  const expectedFingerprint = createWorkspaceFingerprint(
    normalizedRoot,
    normalizedCwd
  );
  if (event.payload.workspaceFingerprint !== expectedFingerprint) {
    return reject(
      'FINGERPRINT_MISMATCH',
      'workspaceFingerprint does not match workspaceRoot/cwd'
    );
  }

  return {
    ok: true,
    value: {
      ...event,
      payload: {
        ...event.payload,
        workspaceRoot: normalizedRoot,
        cwd: normalizedCwd,
        workspaceFingerprint: expectedFingerprint,
      },
    } as GitRequestEvent,
  };
}
