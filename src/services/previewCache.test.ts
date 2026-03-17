import { describe, expect, it, vi } from 'vitest';
import { PreviewCache } from './previewCache';

describe('PreviewCache', () => {
  it('stores and retrieves entries', () => {
    const cache = new PreviewCache({ maxSize: 10, ttlMs: 60000 });
    cache.set('key1', { type: 'file', content: 'hello', path: '/a.ts' });
    expect(cache.get('key1')).toEqual({ type: 'file', content: 'hello', path: '/a.ts' });
  });

  it('returns null for missing keys', () => {
    const cache = new PreviewCache({ maxSize: 10, ttlMs: 60000 });
    expect(cache.get('missing')).toBeNull();
  });

  it('evicts oldest when exceeding maxSize', () => {
    const cache = new PreviewCache({ maxSize: 2, ttlMs: 60000 });
    cache.set('a', { type: 'file', content: '1' });
    cache.set('b', { type: 'file', content: '2' });
    cache.set('c', { type: 'file', content: '3' });
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).not.toBeNull();
    expect(cache.get('c')).not.toBeNull();
  });

  it('expires entries after TTL', () => {
    vi.useFakeTimers();
    const cache = new PreviewCache({ maxSize: 10, ttlMs: 1000 });
    cache.set('key', { type: 'file', content: 'data' });
    vi.advanceTimersByTime(1001);
    expect(cache.get('key')).toBeNull();
    vi.useRealTimers();
  });

  it('refreshes TTL on access', () => {
    vi.useFakeTimers();
    const cache = new PreviewCache({ maxSize: 10, ttlMs: 1000 });
    cache.set('key', { type: 'file', content: 'data' });
    vi.advanceTimersByTime(500);
    cache.get('key');
    vi.advanceTimersByTime(700);
    expect(cache.get('key')).not.toBeNull();
    vi.useRealTimers();
  });

  it('has() checks validity', () => {
    vi.useFakeTimers();
    const cache = new PreviewCache({ maxSize: 10, ttlMs: 1000 });
    cache.set('key', { type: 'file', content: 'data' });
    expect(cache.has('key')).toBe(true);
    vi.advanceTimersByTime(1001);
    expect(cache.has('key')).toBe(false);
    vi.useRealTimers();
  });

  it('clear removes all entries', () => {
    const cache = new PreviewCache({ maxSize: 10, ttlMs: 60000 });
    cache.set('a', { type: 'file', content: '1' });
    cache.set('b', { type: 'file', content: '2' });
    cache.clear();
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });
});
