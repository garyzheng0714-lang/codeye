import { z } from 'zod';
import { claudeMessageSchema } from './protocol';

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

const streamEventSchema = z.discriminatedUnion('type', [
  z.object({
    version: z.number(),
    type: z.literal('message'),
    payload: messagePayloadSchema,
  }),
  z.object({
    version: z.number(),
    type: z.literal('complete'),
    payload: completePayloadSchema,
  }),
  z.object({
    version: z.number(),
    type: z.literal('error'),
    payload: errorPayloadSchema,
  }),
  z.object({
    version: z.number(),
    type: z.literal('auth'),
    payload: authPayloadSchema,
  }),
]);

type StreamEvent = z.infer<typeof streamEventSchema>;

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
