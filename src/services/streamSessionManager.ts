const MANAGER_KEY = '__codeye_stream_manager__' as const;
const IDLE_TIMEOUT_MS = 330_000;

export type StreamStatus = 'idle' | 'streaming' | 'complete' | 'error' | 'aborted';

export interface StreamSnapshot {
  id: string;
  status: StreamStatus;
  startedAt: number;
  lastActivityAt: number;
  chunkCount: number;
}

interface ManagedStream {
  id: string;
  status: StreamStatus;
  abortController: AbortController;
  startedAt: number;
  lastActivityAt: number;
  chunkCount: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

type StreamEventCallback = (sessionId: string, event: StreamStatus) => void;

class StreamSessionManager {
  private streams = new Map<string, ManagedStream>();
  private listeners = new Set<StreamEventCallback>();

  startStream(sessionId: string): AbortController {
    this.stopStream(sessionId);

    const abortController = new AbortController();
    const now = Date.now();

    const stream: ManagedStream = {
      id: sessionId,
      status: 'streaming',
      abortController,
      startedAt: now,
      lastActivityAt: now,
      chunkCount: 0,
      idleTimer: null,
    };

    this.streams.set(sessionId, stream);
    this.notify(sessionId, 'streaming');
    this.resetIdleTimer(sessionId);

    return abortController;
  }

  recordActivity(sessionId: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream || stream.status !== 'streaming') return;

    stream.lastActivityAt = Date.now();
    stream.chunkCount += 1;
    this.resetIdleTimer(sessionId);
  }

  completeStream(sessionId: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;

    this.clearIdleTimer(stream);
    stream.status = 'complete';
    this.notify(sessionId, 'complete');
  }

  errorStream(sessionId: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;

    this.clearIdleTimer(stream);
    stream.status = 'error';
    this.notify(sessionId, 'error');
  }

  stopStream(sessionId: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;

    this.clearIdleTimer(stream);
    if (stream.status === 'streaming') {
      stream.abortController.abort();
      stream.status = 'aborted';
      this.notify(sessionId, 'aborted');
    }
  }

  getSnapshot(sessionId: string): StreamSnapshot | null {
    const stream = this.streams.get(sessionId);
    if (!stream) return null;

    return {
      id: stream.id,
      status: stream.status,
      startedAt: stream.startedAt,
      lastActivityAt: stream.lastActivityAt,
      chunkCount: stream.chunkCount,
    };
  }

  getActiveSessionIds(): string[] {
    return Array.from(this.streams.entries())
      .filter(([, s]) => s.status === 'streaming')
      .map(([id]) => id);
  }

  onStatusChange(callback: StreamEventCallback): () => void {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, stream] of this.streams) {
      if (stream.status !== 'streaming' && now - stream.lastActivityAt > IDLE_TIMEOUT_MS) {
        this.clearIdleTimer(stream);
        this.streams.delete(id);
      }
    }
  }

  destroy(): void {
    for (const [, stream] of this.streams) {
      this.clearIdleTimer(stream);
      if (stream.status === 'streaming') {
        stream.abortController.abort();
      }
    }
    this.streams.clear();
    this.listeners.clear();
  }

  private resetIdleTimer(sessionId: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;

    this.clearIdleTimer(stream);
    stream.idleTimer = setTimeout(() => {
      if (stream.status === 'streaming') {
        stream.status = 'error';
        stream.abortController.abort();
        this.notify(sessionId, 'error');
      }
    }, IDLE_TIMEOUT_MS);
  }

  private clearIdleTimer(stream: ManagedStream): void {
    if (stream.idleTimer) {
      clearTimeout(stream.idleTimer);
      stream.idleTimer = null;
    }
  }

  private notify(sessionId: string, status: StreamStatus): void {
    for (const listener of this.listeners) {
      listener(sessionId, status);
    }
  }
}

function getGlobalManager(): StreamSessionManager {
  const g = globalThis as Record<string, unknown>;
  if (!g[MANAGER_KEY]) {
    g[MANAGER_KEY] = new StreamSessionManager();
  }
  return g[MANAGER_KEY] as StreamSessionManager;
}

export const streamManager = getGlobalManager();
