const STREAM_EVENT_VERSION = 1;

export type ServerStreamEventType =
  | 'message'
  | 'complete'
  | 'error'
  | 'auth'
  | 'feature_flags'
  | 'git_status'
  | 'git_diff_stat'
  | 'git_commit_result'
  | 'git_push_result'
  | 'git_pr_result'
  | 'git_operation_status'
  | 'tool_approval_request'
  | 'tool_approval_response'
  | 'preview_response'
  | 'tool_progress';

export function wrapEvent(
  type: ServerStreamEventType,
  payload: Record<string, unknown>,
  correlationId?: string
): string {
  return JSON.stringify({
    version: STREAM_EVENT_VERSION,
    type,
    payload,
    ...(correlationId ? { correlationId } : {}),
  });
}
