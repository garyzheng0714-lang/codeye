import { describe, expect, it, vi } from 'vitest';
import { StreamBatcher } from './streamBatcher';

describe('StreamBatcher', () => {
  it('flushes accumulated chunks', () => {
    vi.useFakeTimers();
    const flushed: string[][] = [];
    const batcher = new StreamBatcher((chunks) => flushed.push(chunks));

    batcher.push('hello');
    batcher.push(' world');

    vi.advanceTimersByTime(20);

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toEqual(['hello', ' world']);

    batcher.destroy();
    vi.useRealTimers();
  });

  it('immediately flushes when buffer exceeds 32KB', () => {
    const flushed: string[][] = [];
    const batcher = new StreamBatcher((chunks) => flushed.push(chunks));

    const bigChunk = 'x'.repeat(33 * 1024);
    batcher.push(bigChunk);

    expect(flushed).toHaveLength(1);
    expect(flushed[0][0].length).toBe(33 * 1024);

    batcher.destroy();
  });

  it('flushes remaining on destroy', () => {
    const flushed: string[][] = [];
    const batcher = new StreamBatcher((chunks) => flushed.push(chunks));

    batcher.push('leftover');
    batcher.destroy();

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toEqual(['leftover']);
  });
});
