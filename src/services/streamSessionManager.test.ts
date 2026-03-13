import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('StreamSessionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('starts and tracks a stream', async () => {
    const { streamManager } = await import('./streamSessionManager');
    const abort = streamManager.startStream('sess-1');

    expect(abort).toBeInstanceOf(AbortController);
    const snap = streamManager.getSnapshot('sess-1');
    expect(snap).not.toBeNull();
    expect(snap?.status).toBe('streaming');
    expect(snap?.chunkCount).toBe(0);

    streamManager.destroy();
    vi.useRealTimers();
  });

  it('records activity and increments chunk count', async () => {
    const { streamManager } = await import('./streamSessionManager');
    streamManager.startStream('sess-2');

    streamManager.recordActivity('sess-2');
    streamManager.recordActivity('sess-2');
    streamManager.recordActivity('sess-2');

    const snap = streamManager.getSnapshot('sess-2');
    expect(snap?.chunkCount).toBe(3);

    streamManager.destroy();
    vi.useRealTimers();
  });

  it('completes a stream', async () => {
    const { streamManager } = await import('./streamSessionManager');
    streamManager.startStream('sess-3');
    streamManager.completeStream('sess-3');

    expect(streamManager.getSnapshot('sess-3')?.status).toBe('complete');
    expect(streamManager.getActiveSessionIds()).toHaveLength(0);

    streamManager.destroy();
    vi.useRealTimers();
  });

  it('stops a stream with abort', async () => {
    const { streamManager } = await import('./streamSessionManager');
    const abort = streamManager.startStream('sess-4');

    streamManager.stopStream('sess-4');
    expect(abort.signal.aborted).toBe(true);
    expect(streamManager.getSnapshot('sess-4')?.status).toBe('aborted');

    streamManager.destroy();
    vi.useRealTimers();
  });

  it('fires status change listeners', async () => {
    const { streamManager } = await import('./streamSessionManager');
    const events: string[] = [];
    streamManager.onStatusChange((id, status) => {
      events.push(`${id}:${status}`);
    });

    streamManager.startStream('sess-5');
    streamManager.completeStream('sess-5');

    expect(events).toContain('sess-5:streaming');
    expect(events).toContain('sess-5:complete');

    streamManager.destroy();
    vi.useRealTimers();
  });

  it('replaces existing stream on re-start', async () => {
    const { streamManager } = await import('./streamSessionManager');
    const first = streamManager.startStream('sess-6');
    streamManager.startStream('sess-6');

    expect(first.signal.aborted).toBe(true);
    expect(streamManager.getSnapshot('sess-6')?.status).toBe('streaming');

    streamManager.destroy();
    vi.useRealTimers();
  });

  it('returns null for unknown session', async () => {
    const { streamManager } = await import('./streamSessionManager');
    expect(streamManager.getSnapshot('nonexistent')).toBeNull();
    streamManager.destroy();
    vi.useRealTimers();
  });
});
