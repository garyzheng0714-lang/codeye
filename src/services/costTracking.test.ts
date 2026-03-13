import { describe, expect, it } from 'vitest';
import {
  calculateCost,
  getModelPricing,
  aggregateCosts,
  type CostEntry,
  type TokenUsage,
} from './costTracking';

const ZERO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheWriteTokens: 0,
  cacheReadTokens: 0,
};

describe('getModelPricing', () => {
  it('returns pricing for known models', () => {
    expect(getModelPricing('claude-sonnet-4-6')).not.toBeNull();
    expect(getModelPricing('claude-opus-4-6')).not.toBeNull();
    expect(getModelPricing('claude-haiku-4-5')).not.toBeNull();
  });

  it('returns null for unknown models', () => {
    expect(getModelPricing('gpt-4o')).toBeNull();
    expect(getModelPricing('')).toBeNull();
  });
});

describe('calculateCost', () => {
  it('calculates cost for known model', () => {
    const usage: TokenUsage = {
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
    };
    const cost = calculateCost('claude-sonnet-4-6', usage);
    expect(cost).not.toBeNull();
    expect(cost).toBeCloseTo(3 + 7.5, 2);
  });

  it('returns null for unknown model', () => {
    expect(calculateCost('unknown-model', ZERO_USAGE)).toBeNull();
  });

  it('includes cache costs', () => {
    const usage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
    };
    const cost = calculateCost('claude-sonnet-4-6', usage);
    expect(cost).not.toBeNull();
    expect(cost).toBeCloseTo(3.75 + 0.3, 2);
  });
});

describe('aggregateCosts', () => {
  it('aggregates multiple entries', () => {
    const entries: CostEntry[] = [
      {
        messageId: 'msg-1',
        requestId: 'req-1',
        model: 'claude-sonnet-4-6',
        costUsd: 0.01,
        usage: { inputTokens: 100, outputTokens: 50, cacheWriteTokens: 0, cacheReadTokens: 0 },
        timestamp: 1000,
      },
      {
        messageId: 'msg-2',
        requestId: 'req-2',
        model: 'claude-sonnet-4-6',
        costUsd: 0.02,
        usage: { inputTokens: 200, outputTokens: 100, cacheWriteTokens: 0, cacheReadTokens: 0 },
        timestamp: 2000,
      },
    ];

    const summary = aggregateCosts(entries);
    expect(summary.totalCostUsd).toBeCloseTo(0.03);
    expect(summary.totalInputTokens).toBe(300);
    expect(summary.totalOutputTokens).toBe(150);
    expect(summary.entryCount).toBe(2);
  });

  it('deduplicates entries by messageId + requestId', () => {
    const entries: CostEntry[] = [
      {
        messageId: 'msg-1',
        requestId: 'req-1',
        model: 'claude-sonnet-4-6',
        costUsd: 0.01,
        usage: { inputTokens: 100, outputTokens: 50, cacheWriteTokens: 0, cacheReadTokens: 0 },
        timestamp: 1000,
      },
      {
        messageId: 'msg-1',
        requestId: 'req-1',
        model: 'claude-sonnet-4-6',
        costUsd: 0.01,
        usage: { inputTokens: 100, outputTokens: 50, cacheWriteTokens: 0, cacheReadTokens: 0 },
        timestamp: 1001,
      },
    ];

    const summary = aggregateCosts(entries);
    expect(summary.entryCount).toBe(1);
    expect(summary.totalCostUsd).toBeCloseTo(0.01);
  });

  it('falls back to calculated cost when costUsd is null', () => {
    const entries: CostEntry[] = [
      {
        messageId: 'msg-1',
        requestId: 'req-1',
        model: 'claude-haiku-4-5',
        costUsd: null,
        usage: { inputTokens: 1_000_000, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 },
        timestamp: 1000,
      },
    ];

    const summary = aggregateCosts(entries);
    expect(summary.totalCostUsd).toBeCloseTo(0.8);
  });

  it('warns on unknown model with null costUsd', () => {
    const entries: CostEntry[] = [
      {
        messageId: 'msg-1',
        requestId: 'req-1',
        model: 'unknown-model',
        costUsd: null,
        usage: { inputTokens: 1000, outputTokens: 500, cacheWriteTokens: 0, cacheReadTokens: 0 },
        timestamp: 1000,
      },
    ];

    const summary = aggregateCosts(entries);
    expect(summary.unknownModelWarnings).toContain('unknown-model');
    expect(summary.totalCostUsd).toBe(0);
  });
});
