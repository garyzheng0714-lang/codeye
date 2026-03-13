export type ModelId = 'claude-opus-4-6' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';

export interface ModelInfo {
  id: ModelId;
  label: string;
  shortLabel: string;
  description: string;
  tier: 'premium' | 'standard' | 'fast';
}
