import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EFFORT,
  getAllowedEfforts,
  getEffectiveEffort,
  modelSupportsEffort,
  normalizeEffortLevel,
  normalizeModelId,
  toCliModelId,
} from './models';

describe('model capability rules', () => {
  it('normalizes versioned model ids to official aliases', () => {
    expect(normalizeModelId('claude-sonnet-4-6')).toBe('sonnet');
    expect(normalizeModelId('claude-opus-4-6')).toBe('opus');
    expect(normalizeModelId('claude-haiku-4-5')).toBe('haiku');
  });

  it('keeps cli aliases stable for outgoing requests', () => {
    expect(toCliModelId('sonnet')).toBe('sonnet');
    expect(toCliModelId('claude-sonnet-4-6')).toBe('sonnet');
  });

  it('enforces effort support by model', () => {
    expect(modelSupportsEffort('sonnet')).toBe(true);
    expect(modelSupportsEffort('haiku')).toBe(false);
    expect(getAllowedEfforts('sonnet')).toEqual(['low', 'medium', 'high']);
    expect(getAllowedEfforts('haiku')).toEqual([]);
  });

  it('returns undefined effort for unsupported models', () => {
    expect(getEffectiveEffort('haiku', 'high')).toBeUndefined();
  });

  it('normalizes invalid effort values to default', () => {
    expect(normalizeEffortLevel('max')).toBe(DEFAULT_EFFORT);
    expect(normalizeEffortLevel('invalid')).toBe(DEFAULT_EFFORT);
  });
});
