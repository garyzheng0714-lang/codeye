import type { ModelId, ModelInfo, EffortLevel, EffortInfo } from '../types';

export const MODELS: ModelInfo[] = [
  { id: 'claude-opus-4-6', label: 'Opus 4.6', shortLabel: 'Opus', description: 'Deepest reasoning', tier: 'premium' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', shortLabel: 'Sonnet', description: 'Best for coding', tier: 'standard' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', shortLabel: 'Haiku', description: 'Fastest, lowest cost', tier: 'fast' },
];

export const EFFORT_LEVELS: EffortInfo[] = [
  { id: 'low', label: 'Low', shortLabel: 'Low', description: 'Minimal thinking, fastest' },
  { id: 'medium', label: 'Medium', shortLabel: 'Med', description: 'Balanced speed and depth' },
  { id: 'high', label: 'High', shortLabel: 'High', description: 'Deep thinking, thorough' },
  { id: 'max', label: 'Max', shortLabel: 'Max', description: 'Maximum reasoning depth' },
];

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4-6';
export const DEFAULT_EFFORT: EffortLevel = 'high';

export function getModelInfo(id: ModelId): ModelInfo {
  return MODELS.find((m) => m.id === id) ?? MODELS[1];
}

export function getEffortInfo(id: EffortLevel): EffortInfo {
  return EFFORT_LEVELS.find((e) => e.id === id) ?? EFFORT_LEVELS[2];
}
