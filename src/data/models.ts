export type ModelId = 'claude-opus-4-6' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';

export interface ModelInfo {
  id: ModelId;
  label: string;
  shortLabel: string;
  description: string;
  tier: 'premium' | 'standard' | 'fast';
}

export const MODELS: ModelInfo[] = [
  { id: 'claude-opus-4-6', label: 'Opus 4.6', shortLabel: 'Opus', description: 'Deepest reasoning', tier: 'premium' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', shortLabel: 'Sonnet', description: 'Best for coding', tier: 'standard' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', shortLabel: 'Haiku', description: 'Fastest, lowest cost', tier: 'fast' },
];

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4-6';

export function getModelInfo(id: ModelId): ModelInfo {
  return MODELS.find((m) => m.id === id) ?? MODELS[1];
}
