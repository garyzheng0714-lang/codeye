const STREAM_EVENT_VERSION = 1;

export function wrapEvent(
  type: 'message' | 'complete' | 'error' | 'auth',
  payload: Record<string, unknown>
): string {
  return JSON.stringify({ version: STREAM_EVENT_VERSION, type, payload });
}
