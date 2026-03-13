import { describe, expect, it } from 'vitest';
import { parseClaudeMessage, parseWsInboundEvent } from './protocol';

describe('protocol parsing', () => {
  it('parses a Claude assistant message', () => {
    const parsed = parseClaudeMessage({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'hello' }],
      },
      cost_usd: 0.01,
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('assistant');
    expect(parsed?.cost_usd).toBe(0.01);
  });

  it('rejects malformed ws event payload', () => {
    const parsed = parseWsInboundEvent({
      type: 'message',
      data: { nope: true },
    });
    expect(parsed).toBeNull();
  });

  it('parses a ws complete event', () => {
    const parsed = parseWsInboundEvent({ type: 'complete' });
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('complete');
  });
});
