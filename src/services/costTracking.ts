export const PRICE_TABLE_VERSION = 1;

interface ModelPricing {
  inputPerMToken: number;
  outputPerMToken: number;
  cacheWritePerMToken: number;
  cacheReadPerMToken: number;
}

const PRICE_TABLE: Record<string, ModelPricing> = {
  opus: {
    inputPerMToken: 15,
    outputPerMToken: 75,
    cacheWritePerMToken: 18.75,
    cacheReadPerMToken: 1.5,
  },
  'claude-opus-4-6': {
    inputPerMToken: 15,
    outputPerMToken: 75,
    cacheWritePerMToken: 18.75,
    cacheReadPerMToken: 1.5,
  },
  sonnet: {
    inputPerMToken: 3,
    outputPerMToken: 15,
    cacheWritePerMToken: 3.75,
    cacheReadPerMToken: 0.3,
  },
  'claude-sonnet-4-6': {
    inputPerMToken: 3,
    outputPerMToken: 15,
    cacheWritePerMToken: 3.75,
    cacheReadPerMToken: 0.3,
  },
  haiku: {
    inputPerMToken: 0.8,
    outputPerMToken: 4,
    cacheWritePerMToken: 1,
    cacheReadPerMToken: 0.08,
  },
  'claude-haiku-4-5': {
    inputPerMToken: 0.8,
    outputPerMToken: 4,
    cacheWritePerMToken: 1,
    cacheReadPerMToken: 0.08,
  },
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
}

export interface CostEntry {
  messageId: string;
  requestId: string;
  model: string;
  costUsd: number | null;
  usage: TokenUsage;
  timestamp: number;
}

export function getModelPricing(model: string): ModelPricing | null {
  return PRICE_TABLE[model] ?? null;
}

export function calculateCost(model: string, usage: TokenUsage): number | null {
  const pricing = getModelPricing(model);
  if (!pricing) {
    console.warn(`[codeye:cost] Unknown model "${model}" — cost returned as null`);
    return null;
  }

  return (
    (usage.inputTokens / 1_000_000) * pricing.inputPerMToken +
    (usage.outputTokens / 1_000_000) * pricing.outputPerMToken +
    (usage.cacheWriteTokens / 1_000_000) * pricing.cacheWritePerMToken +
    (usage.cacheReadTokens / 1_000_000) * pricing.cacheReadPerMToken
  );
}

interface SessionCostSummary {
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheWriteTokens: number;
  totalCacheReadTokens: number;
  entryCount: number;
  unknownModelWarnings: string[];
}

export function aggregateCosts(entries: CostEntry[]): SessionCostSummary {
  const seen = new Set<string>();
  const warnings: string[] = [];
  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheWrite = 0;
  let totalCacheRead = 0;
  let count = 0;

  for (const entry of entries) {
    const dedupeKey = `${entry.messageId}:${entry.requestId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    count += 1;
    totalInput += entry.usage.inputTokens;
    totalOutput += entry.usage.outputTokens;
    totalCacheWrite += entry.usage.cacheWriteTokens;
    totalCacheRead += entry.usage.cacheReadTokens;

    if (entry.costUsd !== null) {
      totalCost += entry.costUsd;
    } else {
      const calculated = calculateCost(entry.model, entry.usage);
      if (calculated !== null) {
        totalCost += calculated;
      } else if (!warnings.includes(entry.model)) {
        warnings.push(entry.model);
      }
    }
  }

  return {
    totalCostUsd: totalCost,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalCacheWriteTokens: totalCacheWrite,
    totalCacheReadTokens: totalCacheRead,
    entryCount: count,
    unknownModelWarnings: warnings,
  };
}
