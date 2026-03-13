import type { DisplayMessage } from './chat';
import type { ModelId } from './models';

export interface SessionFolder {
  id: string;
  name: string;
  path: string;
  kind: 'local' | 'virtual';
  hasSyncedClaudeHistory: boolean;
  lastSyncedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SessionData {
  id: string;
  folderId: string;
  source: 'local' | 'claude';
  name: string;
  cwd: string;
  claudeSessionId?: string;
  model?: ModelId;
  messages: DisplayMessage[];
  cost: number;
  inputTokens: number;
  outputTokens: number;
  createdAt: number;
  updatedAt: number;
}

export interface ImportedClaudeSession {
  claudeSessionId: string;
  name: string;
  cwd: string;
  model?: string;
  messages: DisplayMessage[];
  inputTokens: number;
  outputTokens: number;
  createdAt: number;
  updatedAt: number;
}
