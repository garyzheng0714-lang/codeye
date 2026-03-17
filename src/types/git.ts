import { z } from 'zod';
import { connectionContextSchema, errorPayloadSchema } from './featureFlags';

export const gitFileStatusSchema = z.object({
  path: z.string().min(1),
  status: z.string().min(1).max(2),
});

export type GitFileStatus = z.infer<typeof gitFileStatusSchema>;

export const gitStatusPayloadSchema = z.object({
  available: z.boolean().optional().default(true),
  branch: z.string().nullable(),
  dirty: z.boolean(),
  ahead: z.number().int().nonnegative(),
  behind: z.number().int().nonnegative(),
  files: z.array(gitFileStatusSchema),
});

export type GitStatusPayload = z.infer<typeof gitStatusPayloadSchema>;

export const gitDiffStatFileSchema = z.object({
  path: z.string().min(1),
  insertions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
});

export type GitDiffStatFile = z.infer<typeof gitDiffStatFileSchema>;

export const gitDiffStatPayloadSchema = z.object({
  files: z.array(gitDiffStatFileSchema),
  summary: z.object({
    filesChanged: z.number().int().nonnegative(),
    insertions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
  }),
});

export type GitDiffStatPayload = z.infer<typeof gitDiffStatPayloadSchema>;

export const gitCommitResultPayloadSchema = z.object({
  operationId: z.uuid(),
  success: z.boolean(),
  hash: z.string().optional(),
  message: z.string().optional(),
  error: errorPayloadSchema.optional(),
});

export type GitCommitResultPayload = z.infer<typeof gitCommitResultPayloadSchema>;

export const gitPushResultPayloadSchema = z.object({
  operationId: z.uuid(),
  success: z.boolean(),
  remote: z.string().optional(),
  branch: z.string().optional(),
  commits: z.number().int().nonnegative().optional(),
  error: errorPayloadSchema.optional(),
});

export type GitPushResultPayload = z.infer<typeof gitPushResultPayloadSchema>;

export const gitPrResultPayloadSchema = z.object({
  operationId: z.uuid(),
  success: z.boolean(),
  url: z.url().optional(),
  number: z.number().int().positive().optional(),
  manualCommand: z.string().optional(),
  error: errorPayloadSchema.optional(),
});

export type GitPrResultPayload = z.infer<typeof gitPrResultPayloadSchema>;

export const gitStatusRequestPayloadSchema = connectionContextSchema;

export type GitStatusRequestPayload = z.infer<typeof gitStatusRequestPayloadSchema>;

export const gitDiffStatRequestPayloadSchema = connectionContextSchema;

export type GitDiffStatRequestPayload = z.infer<
  typeof gitDiffStatRequestPayloadSchema
>;

export const gitCommitRequestPayloadSchema = connectionContextSchema.extend({
  operationId: z.uuid(),
  message: z.string().optional(),
});

export type GitCommitRequestPayload = z.infer<typeof gitCommitRequestPayloadSchema>;

export const gitPushRequestPayloadSchema = connectionContextSchema.extend({
  operationId: z.uuid(),
  remote: z.string().optional(),
  branch: z.string().optional(),
});

export type GitPushRequestPayload = z.infer<typeof gitPushRequestPayloadSchema>;

export const gitPrRequestPayloadSchema = connectionContextSchema.extend({
  operationId: z.uuid(),
  title: z.string().optional(),
  body: z.string().optional(),
  base: z.string().optional(),
  head: z.string().optional(),
});

export type GitPrRequestPayload = z.infer<typeof gitPrRequestPayloadSchema>;

export const gitOperationStatusRequestPayloadSchema =
  connectionContextSchema.extend({
    operationId: z.uuid(),
  });

export type GitOperationStatusRequestPayload = z.infer<
  typeof gitOperationStatusRequestPayloadSchema
>;

export const gitOperationStatusPayloadSchema = z.object({
  operationId: z.uuid(),
  status: z.enum(['pending', 'success', 'error', 'unknown']),
  updatedAt: z.number().int().nonnegative(),
  error: errorPayloadSchema.optional(),
});

export type GitOperationStatusPayload = z.infer<
  typeof gitOperationStatusPayloadSchema
>;

export const gitAddRequestPayloadSchema = connectionContextSchema.extend({
  operationId: z.uuid(),
  all: z.boolean().optional().default(true),
});

export const gitAddResultPayloadSchema = z.object({
  operationId: z.uuid(),
  success: z.boolean(),
  error: errorPayloadSchema.optional(),
});
