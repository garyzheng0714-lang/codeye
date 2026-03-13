import type { DisplayMessage } from './chat';
import type { ModelId } from './models';

export interface SessionData {
  id: string;
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
