interface ElectronAPI {
  claude: {
    query: (params: { prompt: string; sessionId?: string; cwd?: string; mode?: string }) => Promise<void>;
    stop: () => Promise<void>;
    checkAuth: () => Promise<{ authenticated: boolean; method?: string; error?: string }>;
    onMessage: (callback: (message: ClaudeMessage) => void) => () => void;
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

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }

  interface ClaudeMessage {
    type: string;
    subtype?: string;
    message?: {
      role: string;
      content: ContentBlock[];
    };
    result?: string;
    session_id?: string;
    cost_usd?: number;
    duration_ms?: number;
    input_tokens?: number;
    output_tokens?: number;
  }

  interface ContentBlock {
    type: string;
    text?: string;
    tool_use_id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }
}

export {};
