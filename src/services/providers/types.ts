export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  pricing: {
    inputPer1M: number;
    outputPer1M: number;
  };
}

export interface ProviderQueryParams {
  prompt: string;
  sessionId?: string;
  cwd?: string;
  mode?: string;
  model?: string;
  effort?: string;
}

export interface ProviderAuthResult {
  authenticated: boolean;
  method?: string;
  error?: string;
}

export type ProviderStatus = 'ready' | 'authenticating' | 'error' | 'unavailable';

export interface ProviderCallbacks {
  onMessage: (data: unknown) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly models: ModelInfo[];

  checkAuth(): Promise<ProviderAuthResult>;
  query(params: ProviderQueryParams, callbacks: ProviderCallbacks): () => void;
  stop(): void;
}
