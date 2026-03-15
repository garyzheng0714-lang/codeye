export type ChatMode = 'chat' | 'code' | 'plan';

export interface InputAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataBase64: string;
}

export interface PendingMessage {
  prompt: string;
  attachments: InputAttachment[];
}

export interface ToolCallDisplay {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  expanded: boolean;
  progressLines?: string[];
}

export interface GitResultDisplay {
  action: 'commit' | 'push' | 'pr';
  operationId: string;
  success: boolean;
  hash?: string;
  message?: string;
  remote?: string;
  branch?: string;
  url?: string;
  number?: number;
  manualCommand?: string;
  error?: { code: string; message: string; retryable?: boolean };
}

export interface PendingApproval {
  approvalId: string;
  toolName: string;
  args: Record<string, unknown>;
  requestId: string;
  timeoutSec: number;
  receivedAt: number;
}

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: ToolCallDisplay[];
  timestamp: number;
  isStreaming?: boolean;
  gitResult?: GitResultDisplay;
}
