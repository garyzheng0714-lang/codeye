import { z } from 'zod';

const textBlockSchema = z
  .object({
    type: z.literal('text'),
    text: z.string().optional(),
  })
  .passthrough();

const toolUseBlockSchema = z
  .object({
    type: z.literal('tool_use'),
    tool_use_id: z.string().optional(),
    name: z.string().optional(),
    input: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const genericBlockSchema = z
  .object({
    type: z.string(),
  })
  .passthrough();

export const claudeContentBlockSchema = z.union([
  textBlockSchema,
  toolUseBlockSchema,
  genericBlockSchema,
]);

export const claudeMessageSchema = z
  .object({
    type: z.string(),
    subtype: z.string().optional(),
    message: z
      .object({
        role: z.string(),
        content: z.array(claudeContentBlockSchema),
      })
      .optional(),
    result: z.string().optional(),
    session_id: z.string().optional(),
    cost_usd: z.number().optional(),
    duration_ms: z.number().optional(),
    input_tokens: z.number().optional(),
    output_tokens: z.number().optional(),
  })
  .passthrough();

export const wsInboundEventSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('message'),
      data: claudeMessageSchema,
    })
    .passthrough(),
  z
    .object({
      type: z.literal('complete'),
    })
    .passthrough(),
  z
    .object({
      type: z.literal('error'),
      error: z.string(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal('auth'),
      authenticated: z.boolean(),
      method: z.string().optional(),
      error: z.string().optional(),
    })
    .passthrough(),
]);

export type ClaudeMessage = z.infer<typeof claudeMessageSchema>;
export type WsInboundEvent = z.infer<typeof wsInboundEventSchema>;

export function parseClaudeMessage(raw: unknown): ClaudeMessage | null {
  const parsed = claudeMessageSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseWsInboundEvent(raw: unknown): WsInboundEvent | null {
  const parsed = wsInboundEventSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
