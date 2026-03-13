import type {
  AIProvider,
  ModelInfo,
  ProviderQueryParams,
  ProviderAuthResult,
  ProviderCallbacks,
} from './types';
import { getClaudeAdapter } from '../apiAdapter';

const CLAUDE_MODELS: ModelInfo[] = [
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    contextWindow: 200_000,
    maxOutput: 32_000,
    pricing: { inputPer1M: 15, outputPer1M: 75 },
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    contextWindow: 200_000,
    maxOutput: 16_000,
    pricing: { inputPer1M: 3, outputPer1M: 15 },
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    contextWindow: 200_000,
    maxOutput: 8_192,
    pricing: { inputPer1M: 0.8, outputPer1M: 4 },
  },
];

export class ClaudeProvider implements AIProvider {
  readonly id = 'claude';
  readonly name = 'Claude Code';
  readonly icon = 'anthropic';
  readonly models = CLAUDE_MODELS;

  private cleanups: (() => void)[] = [];

  async checkAuth(): Promise<ProviderAuthResult> {
    const adapter = getClaudeAdapter();
    return adapter.checkAuth();
  }

  query(params: ProviderQueryParams, callbacks: ProviderCallbacks): () => void {
    const adapter = getClaudeAdapter();

    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];

    const removeMsg = adapter.onMessage(callbacks.onMessage);
    const removeDone = adapter.onComplete(callbacks.onComplete);
    const removeErr = adapter.onError(callbacks.onError);

    this.cleanups.push(removeMsg, removeDone, removeErr);

    adapter.query({
      prompt: params.prompt,
      sessionId: params.sessionId,
      cwd: params.cwd,
      mode: params.mode,
      model: params.model,
      effort: params.effort,
    });

    return () => {
      this.cleanups.forEach((fn) => fn());
      this.cleanups = [];
    };
  }

  stop(): void {
    const adapter = getClaudeAdapter();
    adapter.stop();
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
  }
}
