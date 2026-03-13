type StreamStatus = 'completed' | 'error' | 'aborted';
type TransportType = 'ws' | 'electron';

const METRICS_STORAGE_KEY = 'codeye.perf-baseline.v1';
const MAX_METRICS = 200;

export interface PerfBaselineSample {
  traceId: string;
  createdAt: number;
  mode: string;
  model: string;
  transport: TransportType;
  inputDispatchMs: number;
  ttftMs: number | null;
  streamDurationMs: number | null;
  chunkCount: number;
  status: StreamStatus;
}

interface ActiveTrace {
  traceId: string;
  startedAt: number;
  firstChunkAt: number | null;
  chunkCount: number;
  mode: string;
  model: string;
  transport: TransportType;
  inputDispatchMs: number;
}

let activeTrace: ActiveTrace | null = null;

function saveSample(sample: PerfBaselineSample): void {
  try {
    const existing = getPerfBaselineSamples();
    const next = [sample, ...existing].slice(0, MAX_METRICS);
    window.localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Metrics must never break product behavior.
  }
}

export function getPerfBaselineSamples(): PerfBaselineSample[] {
  try {
    const raw = window.localStorage.getItem(METRICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PerfBaselineSample[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearPerfBaselineSamples(): void {
  try {
    window.localStorage.removeItem(METRICS_STORAGE_KEY);
  } catch {
    // noop
  }
}

export function startStreamTrace(params: {
  mode: string;
  model: string;
  transport: TransportType;
  inputDispatchMs: number;
}): string {
  const traceId = crypto.randomUUID();
  activeTrace = {
    traceId,
    startedAt: performance.now(),
    firstChunkAt: null,
    chunkCount: 0,
    mode: params.mode,
    model: params.model,
    transport: params.transport,
    inputDispatchMs: params.inputDispatchMs,
  };
  return traceId;
}

export function markStreamChunk(): void {
  if (!activeTrace) return;
  activeTrace.chunkCount += 1;
  if (activeTrace.firstChunkAt === null) {
    activeTrace.firstChunkAt = performance.now();
  }
}

export function finishStreamTrace(status: StreamStatus): void {
  if (!activeTrace) return;

  const now = performance.now();
  const sample: PerfBaselineSample = {
    traceId: activeTrace.traceId,
    createdAt: Date.now(),
    mode: activeTrace.mode,
    model: activeTrace.model,
    transport: activeTrace.transport,
    inputDispatchMs: Number(activeTrace.inputDispatchMs.toFixed(2)),
    ttftMs:
      activeTrace.firstChunkAt === null
        ? null
        : Number((activeTrace.firstChunkAt - activeTrace.startedAt).toFixed(2)),
    streamDurationMs: Number((now - activeTrace.startedAt).toFixed(2)),
    chunkCount: activeTrace.chunkCount,
    status,
  };

  saveSample(sample);
  activeTrace = null;
}
