export interface MultiRunConfig {
  id: string;
  prompt: string;
  models: string[];
  mode?: string;
  effort?: string;
  cwd?: string;
}

export type RunStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface RunResult {
  model: string;
  status: RunStatus;
  content: string;
  startedAt: number;
  completedAt?: number;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

import { EventEmitter } from '../utils/eventEmitter';

export interface MultiRunSession {
  id: string;
  prompt: string;
  results: RunResult[];
  createdAt: number;
}

class MultiRunManager {
  private sessions = new Map<string, MultiRunSession>();
  private emitter = new EventEmitter<(session: MultiRunSession) => void>();

  createSession(config: MultiRunConfig): MultiRunSession {
    const session: MultiRunSession = {
      id: config.id,
      prompt: config.prompt,
      results: config.models.map((model) => ({
        model,
        status: 'pending',
        content: '',
        startedAt: 0,
      })),
      createdAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    this.emitter.emit(session);
    return session;
  }

  updateResult(sessionId: string, model: string, update: Partial<RunResult>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updated: MultiRunSession = {
      ...session,
      results: session.results.map((r) =>
        r.model === model ? { ...r, ...update } : r
      ),
    };

    this.sessions.set(sessionId, updated);
    this.emitter.emit(updated);
  }

  appendContent(sessionId: string, model: string, chunk: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updated: MultiRunSession = {
      ...session,
      results: session.results.map((r) =>
        r.model === model ? { ...r, content: r.content + chunk, status: 'streaming' } : r
      ),
    };

    this.sessions.set(sessionId, updated);
    this.emitter.emit(updated);
  }

  getSession(id: string): MultiRunSession | undefined {
    return this.sessions.get(id);
  }

  isComplete(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return true;
    return session.results.every((r) => r.status === 'complete' || r.status === 'error');
  }

  subscribe(listener: (session: MultiRunSession) => void): () => void {
    return this.emitter.on(listener);
  }
}

export const multiRunManager = new MultiRunManager();
