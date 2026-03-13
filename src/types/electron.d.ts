interface ElectronAPI {
  claude: {
    query: (params: { prompt: string; sessionId?: string; cwd?: string; mode?: string }) => Promise<void>;
    stop: () => Promise<void>;
    checkAuth: () => Promise<{ authenticated: boolean; method?: string; error?: string }>;
    onMessage: (callback: (message: unknown) => void) => () => void;
    onComplete: (callback: () => void) => () => void;
    onError: (callback: (error: string) => void) => () => void;
  };
  sessions: {
    list: () => Promise<Session[]>;
    create: (name: string, cwd: string) => Promise<Session>;
    rename: (id: string, name: string) => Promise<Session>;
    delete: (id: string) => Promise<boolean>;
    getMessages: (sessionId: string) => Promise<ChatMessage[]>;
  };
  projects: {
    list: () => Promise<ProjectInfo[]>;
    selectDirectory: () => Promise<string | null>;
    importClaudeHistory: (folderPath: string) => Promise<ImportedClaudeSession[]>;
  };
  secrets: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<boolean>;
    delete: (key: string) => Promise<boolean>;
    listKeys: () => Promise<string[]>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
}

interface Session {
  id: string;
  name: string;
  cwd: string;
  claudeSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: string;
}

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
}

interface ProjectInfo {
  id: string;
  path: string;
  name: string;
}

interface ImportedClaudeSession {
  claudeSessionId: string;
  name: string;
  cwd: string;
  model?: string;
  messages: ImportedDisplayMessage[];
  inputTokens: number;
  outputTokens: number;
  createdAt: number;
  updatedAt: number;
}

interface ImportedDisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: ImportedToolCall[];
  timestamp: number;
}

interface ImportedToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  expanded: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
