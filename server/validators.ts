export interface QueryMessage {
  type: 'query';
  prompt: string;
  cwd?: string;
  mode?: string;
  model?: string;
  effort?: string;
  sessionId?: string;
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
