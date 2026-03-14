type StreamStatus = 'completed' | 'error' | 'aborted';
type TransportType = 'ws' | 'electron';

const METRICS_STORAGE_KEY = 'codeye.perf-baseline.v1';
const MAX_METRICS = 200;

interface PerfBaselineSample {
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

function getPerfBaselineSamples(): PerfBaselineSample[] {
  try {
    const raw = window.localStorage.getItem(METRICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PerfBaselineSample[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function startStreamTrace(params: {
  mode: string;
  model: string;
  transport: TransportType;
  inputDispatchMs: number;
}): string {
  const traceId = crypto.randomUUID();

  performance.mark('codeye:stream-start');

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
    performance.mark('codeye:first-token');
    try {
      performance.measure('codeye:ttft', 'codeye:stream-start', 'codeye:first-token');
    } catch {
      // marks may have been cleared
    }
  }
}

export function finishStreamTrace(status: StreamStatus): void {
  if (!activeTrace) return;

  const now = performance.now();
  performance.mark('codeye:stream-end');
  try {
    performance.measure('codeye:stream-duration', 'codeye:stream-start', 'codeye:stream-end');
  } catch {
    // marks may have been cleared
  }

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

