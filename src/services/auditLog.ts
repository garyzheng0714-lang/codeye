import { readJson, writeJson } from '../utils/jsonStorage';

export interface AuditEntry {
  timestamp: number;
  tool: string;
  argsHash: string;
  resultStatus: 'success' | 'error' | 'denied';
  sessionId?: string;
  durationMs?: number;
}

const MAX_LOG_ENTRIES = 1000;
const AUDIT_STORAGE_KEY = 'codeye.audit-log';

let logBuffer: AuditEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function logToolExecution(entry: Omit<AuditEntry, 'timestamp'>): void {
  const full: AuditEntry = {
    ...entry,
    timestamp: Date.now(),
  };

  logBuffer.push(full);

  if (!flushTimer) {
    flushTimer = setTimeout(() => flushToStorage(), 5000);
  }
}

export function getAuditLog(limit = 100): AuditEntry[] {
  flushToStorage();
  const entries = readJson<AuditEntry[]>(AUDIT_STORAGE_KEY) ?? [];
  return entries.slice(0, limit);
}

export function clearAuditLog(): void {
  logBuffer = [];
  try {
    localStorage.removeItem(AUDIT_STORAGE_KEY);
  } catch { /* noop */ }
}

function flushToStorage(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (logBuffer.length === 0) return;

  const existing = readJson<AuditEntry[]>(AUDIT_STORAGE_KEY) ?? [];
  const merged = [...logBuffer, ...existing].slice(0, MAX_LOG_ENTRIES);
  writeJson(AUDIT_STORAGE_KEY, merged);

  logBuffer = [];
}

export function hashArgs(args: Record<string, unknown>): string {
  const str = JSON.stringify(args);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
