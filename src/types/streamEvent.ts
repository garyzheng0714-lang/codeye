import { z } from 'zod';
import { claudeMessageSchema } from './protocol';
import { featureFlagDocumentV1Schema } from './featureFlags';
import {
  gitCommitRequestPayloadSchema,
  gitCommitResultPayloadSchema,
  gitDiffStatPayloadSchema,
  gitDiffStatRequestPayloadSchema,
  gitOperationStatusPayloadSchema,
  gitOperationStatusRequestPayloadSchema,
  gitPrRequestPayloadSchema,
  gitPrResultPayloadSchema,
  gitPushRequestPayloadSchema,
  gitPushResultPayloadSchema,
  gitStatusPayloadSchema,
  gitStatusRequestPayloadSchema,
} from './git';

export const STREAM_EVENT_VERSION = 1;

const messagePayloadSchema = z.object({
  data: claudeMessageSchema,
});

const completePayloadSchema = z.object({}).passthrough();

const errorPayloadSchema = z.object({
  error: z.string(),
});

const authPayloadSchema = z.object({
  authenticated: z.boolean(),
  method: z.string().optional(),
  error: z.string().optional(),
});

const toolApprovalRequestPayloadSchema = z.object({
  approvalId: z.uuid(),
  toolName: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
  requestId: z.uuid(),
  timeoutSec: z.number().int().positive().default(120),
});

const toolApprovalResponsePayloadSchema = z.object({
  approvalId: z.uuid(),
  decision: z.enum(['allow', 'deny']),
});

const previewResponsePayloadSchema = z.object({
  type: z.enum(['file', 'diff']),
  content: z.string(),
  path: z.string().optional(),
});

const toolProgressPayloadSchema = z.object({
  toolId: z.string().min(1),
  requestId: z.uuid(),
  lines: z.array(z.string()),
  finished: z.boolean(),
});

const eventBaseSchema = z.object({
  version: z.number().int().positive(),
  correlationId: z.uuid().optional(),
});

function buildEventSchema<TType extends string, TPayload extends z.ZodTypeAny>(
  type: TType,
  payload: TPayload
) {
  return eventBaseSchema.extend({
    type: z.literal(type),
    payload,
  });
}

const streamEventSchema = z.discriminatedUnion('type', [
  buildEventSchema('message', messagePayloadSchema),
  buildEventSchema('complete', completePayloadSchema),
  buildEventSchema('error', errorPayloadSchema),
  buildEventSchema('auth', authPayloadSchema),
  buildEventSchema('feature_flags', featureFlagDocumentV1Schema),
  buildEventSchema('git_status', gitStatusPayloadSchema),
  buildEventSchema('git_diff_stat', gitDiffStatPayloadSchema),
  buildEventSchema('git_commit_result', gitCommitResultPayloadSchema),
  buildEventSchema('git_push_result', gitPushResultPayloadSchema),
  buildEventSchema('git_pr_result', gitPrResultPayloadSchema),
  buildEventSchema('git_operation_status', gitOperationStatusPayloadSchema),
  buildEventSchema('tool_approval_request', toolApprovalRequestPayloadSchema),
  buildEventSchema('tool_approval_response', toolApprovalResponsePayloadSchema),
  buildEventSchema('preview_response', previewResponsePayloadSchema),
  buildEventSchema('tool_progress', toolProgressPayloadSchema),
  buildEventSchema('git_status_request', gitStatusRequestPayloadSchema),
  buildEventSchema('git_diff_stat_request', gitDiffStatRequestPayloadSchema),
  buildEventSchema('git_commit_request', gitCommitRequestPayloadSchema),
  buildEventSchema('git_push_request', gitPushRequestPayloadSchema),
  buildEventSchema('git_pr_request', gitPrRequestPayloadSchema),
  buildEventSchema(
    'git_operation_status_request',
    gitOperationStatusRequestPayloadSchema
  ),
]);

export type StreamEvent = z.infer<typeof streamEventSchema>;

export function parseStreamEvent(raw: unknown): StreamEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const record = raw as Record<string, unknown>;

  if ('version' in record && typeof record.version === 'number') {
    const parsed = streamEventSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  if ('type' in record && typeof record.type === 'string') {
    return upgradeLegacyEvent(record);
  }

  return null;
}

function upgradeLegacyEvent(
  record: Record<string, unknown>
): StreamEvent | null {
  const type = record.type as string;

  if (type === 'message' && 'data' in record) {
    const dataResult = claudeMessageSchema.safeParse(record.data);
    if (!dataResult.success) return null;
    return {
      version: STREAM_EVENT_VERSION,
      type: 'message',
      payload: { data: dataResult.data },
    };
  }

  if (type === 'complete') {
    return { version: STREAM_EVENT_VERSION, type: 'complete', payload: {} };
  }

  if (type === 'error' && typeof record.error === 'string') {
    return {
      version: STREAM_EVENT_VERSION,
      type: 'error',
      payload: { error: record.error },
    };
  }

  if (type === 'auth' && typeof record.authenticated === 'boolean') {
    return {
      version: STREAM_EVENT_VERSION,
      type: 'auth',
      payload: {
        authenticated: record.authenticated,
        method:
          typeof record.method === 'string' ? record.method : undefined,
        error: typeof record.error === 'string' ? record.error : undefined,
      },
    };
  }

  return null;
}
