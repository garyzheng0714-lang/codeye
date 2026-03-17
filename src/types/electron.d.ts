interface ElectronAPI {
  getCwd: () => Promise<string>;
  claude: {
    query: (params: { prompt: string; sessionId?: string; cwd?: string; mode?: string; model?: string; effort?: string; permissionMode?: string; attachments?: ElectronAttachment[] }) => Promise<void>;
    stop: () => Promise<void>;
    checkAuth: () => Promise<{ authenticated: boolean; method?: string; error?: string }>;
    onMessage: (callback: (message: unknown) => void) => () => void;
    onComplete: (callback: () => void) => () => void;
    onError: (callback: (error: string) => void) => () => void;
    queryPane: (paneId: string, params: { prompt: string; sessionId?: string; cwd?: string; mode?: string; model?: string; effort?: string; permissionMode?: string; attachments?: ElectronAttachment[] }) => Promise<void>;
    stopPane: (paneId: string) => Promise<void>;
    onPaneMessage: (paneId: string, callback: (message: unknown) => void) => () => void;
    onPaneComplete: (paneId: string, callback: () => void) => () => void;
    onPaneError: (paneId: string, callback: (error: string) => void) => () => void;
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
    getGitStatus: (cwd: string) => Promise<GitStatusSnapshot>;
    listBranches: (folderPath: string) => Promise<string[]>;
    createBranch: (folderPath: string, branchName: string) => Promise<{ success: boolean; branch: string; error?: string }>;
    checkoutBranch: (folderPath: string, branchName: string) => Promise<{ success: boolean; branch: string; error?: string }>;
    renameBranch: (folderPath: string, oldName: string, newName: string) => Promise<{ success: boolean; branch: string; error?: string }>;
    watchHistory: (folderPath: string, encodedPath: string) => Promise<void>;
    unwatchHistory: (encodedPath: string) => Promise<void>;
    onHistoryChanged: (callback: (encodedPath: string) => void) => () => void;
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
  updater: {
    getState: () => Promise<UpdaterState>;
    checkForUpdates: () => Promise<UpdaterState>;
    quitAndInstall: () => Promise<boolean>;
    openLatestRelease: () => Promise<boolean>;
    onStateChange: (callback: (state: UpdaterState) => void) => () => void;
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
  sessionCount?: number;
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

interface ElectronAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataBase64: string;
}

interface GitStatusSnapshot {
  available: boolean;
  cwd: string;
  branch: string | null;
  dirty: boolean;
  ahead: number;
  behind: number;
}

declare global {
  type UpdaterStage =
    | 'idle'
    | 'unsupported'
    | 'checking'
    | 'available'
    | 'downloading'
    | 'downloaded'
    | 'not-available'
    | 'error';

  interface UpdaterState {
    stage: UpdaterStage;
    message: string;
    currentVersion: string;
    latestVersion?: string;
    percent?: number;
    transferred?: number;
    total?: number;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
