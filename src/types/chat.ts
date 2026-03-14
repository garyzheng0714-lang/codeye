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
}

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: ToolCallDisplay[];
  timestamp: number;
  isStreaming?: boolean;
}
