import type { ModelAlias, ModelId, ModelInfo, EffortLevel, EffortInfo } from '../types';

const ALIAS_ORDER: ModelAlias[] = ['opus', 'sonnet', 'haiku'];
const EFFORT_SUPPORTED_MODELS = new Set<ModelAlias>(['opus', 'sonnet']);

const MODEL_MAP: Record<ModelAlias, ModelInfo> = {
  opus: {
    id: 'opus',
    cliAlias: 'opus',
    label: 'Opus (Latest)',
    shortLabel: 'Opus',
    description: 'Deepest reasoning',
    tier: 'premium',
    supportsEffort: true,
  },
  sonnet: {
    id: 'sonnet',
    cliAlias: 'sonnet',
    label: 'Sonnet (Latest)',
    shortLabel: 'Sonnet',
    description: 'Best for coding',
    tier: 'standard',
    supportsEffort: true,
  },
  haiku: {
    id: 'haiku',
    cliAlias: 'haiku',
    label: 'Haiku (Latest)',
    shortLabel: 'Haiku',
    description: 'Fastest, lowest cost',
    tier: 'fast',
    supportsEffort: false,
  },
};

export const MODELS: ModelInfo[] = ALIAS_ORDER.map((alias) => MODEL_MAP[alias]);

export const EFFORT_LEVELS: EffortInfo[] = [
  { id: 'low', label: 'Low', shortLabel: 'Low', description: 'Minimal thinking, fastest' },
  { id: 'medium', label: 'Medium', shortLabel: 'Med', description: 'Balanced speed and depth' },
  { id: 'high', label: 'High', shortLabel: 'High', description: 'Deep thinking, thorough' },
];

export const DEFAULT_MODEL: ModelId = 'sonnet';
export const DEFAULT_EFFORT: EffortLevel = 'high';

function inferModelAlias(model?: string): ModelAlias | null {
  if (!model) return null;
  const normalized = model.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized === 'opus' || normalized.startsWith('claude-opus-')) return 'opus';
  if (normalized === 'sonnet' || normalized.startsWith('claude-sonnet-')) return 'sonnet';
  if (normalized === 'haiku' || normalized.startsWith('claude-haiku-')) return 'haiku';

  if (normalized.includes('opus')) return 'opus';
  if (normalized.includes('sonnet')) return 'sonnet';
  if (normalized.includes('haiku')) return 'haiku';
  return null;
}

export function normalizeModelId(model?: string): ModelId {
  return inferModelAlias(model) ?? DEFAULT_MODEL;
}

export function toCliModelId(model: ModelId): ModelAlias {
  return inferModelAlias(model) ?? (DEFAULT_MODEL as ModelAlias);
}

export function modelSupportsEffort(model: ModelId): boolean {
  return EFFORT_SUPPORTED_MODELS.has(toCliModelId(model));
}

export function getAllowedEfforts(model: ModelId): EffortLevel[] {
  if (!modelSupportsEffort(model)) return [];
  return EFFORT_LEVELS.map((entry) => entry.id);
}

export function normalizeEffortLevel(effort?: string): EffortLevel {
  if (effort === 'low' || effort === 'medium' || effort === 'high') {
    return effort;
  }
  return DEFAULT_EFFORT;
}

export function getEffectiveEffort(
  model: ModelId,
  effort?: EffortLevel | string
): EffortLevel | undefined {
  if (!modelSupportsEffort(model)) return undefined;
  return normalizeEffortLevel(effort);
}

export function getModelInfo(id: ModelId): ModelInfo {
  return MODEL_MAP[toCliModelId(id)] ?? MODEL_MAP.sonnet;
}

export function getEffortInfo(id: EffortLevel): EffortInfo {
  return EFFORT_LEVELS.find((effort) => effort.id === id) ?? EFFORT_LEVELS[2];
}
