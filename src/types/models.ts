export type ModelAlias = 'opus' | 'sonnet' | 'haiku';

export type ModelId = ModelAlias | `claude-${string}`;

export type EffortLevel = 'low' | 'medium' | 'high';

export interface ModelInfo {
  id: ModelId;
  cliAlias: ModelAlias;
  label: string;
  shortLabel: string;
  description: string;
  tier: 'premium' | 'standard' | 'fast';
  supportsEffort: boolean;
}

export interface EffortInfo {
  id: EffortLevel;
  label: string;
  shortLabel: string;
  description: string;
}
