import { describe, expect, it } from 'vitest';
import { parseStreamEvent, STREAM_EVENT_VERSION } from './streamEvent';

describe('StreamEvent parsing', () => {
  it('parses a versioned message event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'message',
      payload: {
        data: {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'hello' }],
          },
        },
      },
    });

    expect(event).not.toBeNull();
    expect(event?.version).toBe(STREAM_EVENT_VERSION);
    expect(event?.type).toBe('message');
    expect(event?.payload).toHaveProperty('data');
  });

  it('parses a versioned complete event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'complete',
      payload: {},
    });
    expect(event).not.toBeNull();
    expect(event?.type).toBe('complete');
  });

  it('parses a versioned error event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'error',
      payload: { error: 'something went wrong' },
    });
    expect(event).not.toBeNull();
    expect(event?.type).toBe('error');
    if (event?.type === 'error') {
      expect(event.payload.error).toBe('something went wrong');
    }
  });

  it('parses a versioned auth event', () => {
    const event = parseStreamEvent({
      version: 1,
      type: 'auth',
      payload: { authenticated: true, method: 'cli' },
    });
    expect(event).not.toBeNull();
    expect(event?.type).toBe('auth');
    if (event?.type === 'auth') {
      expect(event.payload.authenticated).toBe(true);
    }
  });

  it('upgrades a legacy message event (no version field)', () => {
    const event = parseStreamEvent({
      type: 'message',
      data: {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'legacy' }],
        },
      },
    });

    expect(event).not.toBeNull();
    expect(event?.version).toBe(STREAM_EVENT_VERSION);
    expect(event?.type).toBe('message');
  });

  it('upgrades a legacy complete event', () => {
    const event = parseStreamEvent({ type: 'complete' });
    expect(event).not.toBeNull();
    expect(event?.type).toBe('complete');
  });

  it('upgrades a legacy error event', () => {
    const event = parseStreamEvent({ type: 'error', error: 'fail' });
    expect(event?.type).toBe('error');
    if (event?.type === 'error') {
      expect(event.payload.error).toBe('fail');
    }
  });

  it('upgrades a legacy auth event', () => {
    const event = parseStreamEvent({
      type: 'auth',
      authenticated: false,
      error: 'no CLI',
    });
    expect(event?.type).toBe('auth');
    if (event?.type === 'auth') {
      expect(event.payload.authenticated).toBe(false);
      expect(event.payload.error).toBe('no CLI');
    }
  });

  it('returns null for invalid input', () => {
    expect(parseStreamEvent(null)).toBeNull();
    expect(parseStreamEvent(42)).toBeNull();
    expect(parseStreamEvent('bad')).toBeNull();
    expect(parseStreamEvent({ type: 'unknown_event' })).toBeNull();
  });
});
