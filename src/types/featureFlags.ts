import { z } from 'zod';

export const featureFlagsSchema = z.object({
  protocolV2: z.boolean(),
  gitReadStatus: z.boolean(),
  gitWriteFlow: z.boolean(),
  gitResultCards: z.boolean(),
  toolApproval: z.boolean(),
  streamingMarkdown: z.boolean(),
  commandPalette: z.boolean(),
});

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;

export const DEFAULT_SERVER_FLAGS: FeatureFlags = {
  protocolV2: true,
  gitReadStatus: true,
  gitWriteFlow: true,
  gitResultCards: true,
  toolApproval: true,
  streamingMarkdown: true,
  commandPalette: true,
};

export const DEFAULT_LOCAL_FLAGS: FeatureFlags = {
  protocolV2: true,
  gitReadStatus: true,
  gitWriteFlow: true,
  gitResultCards: true,
  toolApproval: false,
  streamingMarkdown: false,
  commandPalette: false,
};

export const featureFlagDocumentV1Schema = z.object({
  _schemaVersion: z.literal(1),
  flags: featureFlagsSchema,
  updatedAt: z.number().int().nonnegative(),
});

export type FeatureFlagDocumentV1 = z.infer<typeof featureFlagDocumentV1Schema>;

const WORKSPACE_FINGERPRINT_RE = /^[a-f0-9]{64}$/i;

export const connectionContextSchema = z.object({
  requestId: z.uuid(),
  correlationId: z.uuid().optional(),
  cwd: z.string().min(1),
  workspaceRoot: z.string().min(1),
  workspaceFingerprint: z.string().regex(WORKSPACE_FINGERPRINT_RE),
});

export type ConnectionContext = z.infer<typeof connectionContextSchema>;

export const errorPayloadSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean().optional().default(false),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorPayload = z.infer<typeof errorPayloadSchema>;

export function parseFeatureFlagDocument(
  raw: unknown
): FeatureFlagDocumentV1 | null {
  const parsed = featureFlagDocumentV1Schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseConnectionContext(raw: unknown): ConnectionContext | null {
  const parsed = connectionContextSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseErrorPayload(raw: unknown): ErrorPayload | null {
  const parsed = errorPayloadSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function mergeEffectiveFlags(
  serverFlags: FeatureFlags,
  localFlags: FeatureFlags
): FeatureFlags {
  return {
    protocolV2: serverFlags.protocolV2 && localFlags.protocolV2,
    gitReadStatus: serverFlags.gitReadStatus && localFlags.gitReadStatus,
    gitWriteFlow: serverFlags.gitWriteFlow && localFlags.gitWriteFlow,
    gitResultCards: serverFlags.gitResultCards && localFlags.gitResultCards,
    toolApproval: serverFlags.toolApproval && localFlags.toolApproval,
    streamingMarkdown:
      serverFlags.streamingMarkdown && localFlags.streamingMarkdown,
    commandPalette: serverFlags.commandPalette && localFlags.commandPalette,
  };
}
