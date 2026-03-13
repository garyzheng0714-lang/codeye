import type { ImportedClaudeSession } from '../types';
import { sendMessage, getOrCreateWs } from './websocket';

export type RuntimeMode = 'electron' | 'browser';

export function detectRuntime(): RuntimeMode {
  return window.electronAPI ? 'electron' : 'browser';
}

export interface QueryParams {
  prompt: string;
  sessionId?: string;
  cwd?: string;
  mode?: string;
  model?: string;
  effort?: string;
}

export interface AuthResult {
  authenticated: boolean;
  method?: string;
  error?: string;
}

export interface ProjectInfo {
  id: string;
  path: string;
  name: string;
}

export interface ClaudeAdapter {
  query(params: QueryParams): void;
  stop(): void;
  checkAuth(): Promise<AuthResult>;
  onMessage(callback: (message: unknown) => void): () => void;
  onComplete(callback: () => void): () => void;
  onError(callback: (error: string) => void): () => void;
}

export interface ProjectAdapter {
  list(): Promise<ProjectInfo[]>;
  selectDirectory(): Promise<string | null>;
  importClaudeHistory(folderPath: string): Promise<ImportedClaudeSession[]>;
}

function createElectronClaudeAdapter(): ClaudeAdapter {
  const api = window.electronAPI!;
  return {
    query: (params) => api.claude.query(params),
    stop: () => api.claude.stop(),
    checkAuth: () => api.claude.checkAuth(),
    onMessage: (cb) => api.claude.onMessage(cb),
    onComplete: (cb) => api.claude.onComplete(cb),
    onError: (cb) => api.claude.onError(cb),
  };
}

function createBrowserClaudeAdapter(): ClaudeAdapter {
  const messageListeners = new Set<(msg: unknown) => void>();
  const completeListeners = new Set<() => void>();
  const errorListeners = new Set<(err: string) => void>();

  return {
    query(params) {
      sendMessage({ type: 'query', ...params });
    },
    stop() {
      sendMessage({ type: 'stop' });
    },
    async checkAuth() {
      return { authenticated: true, method: 'browser-proxy' };
    },
    onMessage(callback) {
      messageListeners.add(callback);
      return () => { messageListeners.delete(callback); };
    },
    onComplete(callback) {
      completeListeners.add(callback);
      return () => { completeListeners.delete(callback); };
    },
    onError(callback) {
      errorListeners.add(callback);
      return () => { errorListeners.delete(callback); };
    },
  };
}

function createElectronProjectAdapter(): ProjectAdapter {
  const api = window.electronAPI!;
  return {
    list: () => api.projects.list(),
    selectDirectory: () => api.projects.selectDirectory(),
    importClaudeHistory: (folderPath) => api.projects.importClaudeHistory(folderPath),
  };
}

function createBrowserProjectAdapter(): ProjectAdapter {
  return {
    async list() { return []; },
    async selectDirectory() { return null; },
    async importClaudeHistory() { return []; },
  };
}

let cachedClaudeAdapter: ClaudeAdapter | null = null;
let cachedProjectAdapter: ProjectAdapter | null = null;

export function getClaudeAdapter(): ClaudeAdapter {
  if (!cachedClaudeAdapter) {
    cachedClaudeAdapter = detectRuntime() === 'electron'
      ? createElectronClaudeAdapter()
      : createBrowserClaudeAdapter();
  }
  return cachedClaudeAdapter;
}

export function getProjectAdapter(): ProjectAdapter {
  if (!cachedProjectAdapter) {
    cachedProjectAdapter = detectRuntime() === 'electron'
      ? createElectronProjectAdapter()
      : createBrowserProjectAdapter();
  }
  return cachedProjectAdapter;
}

export function isElectron(): boolean {
  return detectRuntime() === 'electron';
}

export function isBrowser(): boolean {
  return detectRuntime() === 'browser';
}
