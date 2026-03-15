import { EventEmitter } from '../utils/eventEmitter';

export type ActivityType =
  | 'session_created'
  | 'session_forked'
  | 'message_sent'
  | 'message_received'
  | 'tool_executed'
  | 'file_modified'
  | 'error_occurred'
  | 'git_action'
  | 'git_result';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  sessionId: string;
  sessionName: string;
  summary: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const MAX_ENTRIES = 200;

class ActivityStream {
  private entries: ActivityEntry[] = [];
  private emitter = new EventEmitter<(entries: ActivityEntry[]) => void>();

  push(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): void {
    const full: ActivityEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.entries = [full, ...this.entries].slice(0, MAX_ENTRIES);
    this.emitter.emit(this.entries);
  }

  getEntries(filter?: { type?: ActivityType; sessionId?: string; limit?: number }): ActivityEntry[] {
    let result = this.entries;

    if (filter?.type) {
      result = result.filter((e) => e.type === filter.type);
    }
    if (filter?.sessionId) {
      result = result.filter((e) => e.sessionId === filter.sessionId);
    }
    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  getRecentBySession(limit = 10): Map<string, ActivityEntry[]> {
    const grouped = new Map<string, ActivityEntry[]>();
    for (const entry of this.entries) {
      const list = grouped.get(entry.sessionId) ?? [];
      if (list.length < limit) {
        list.push(entry);
        grouped.set(entry.sessionId, list);
      }
    }
    return grouped;
  }

  subscribe(listener: (entries: ActivityEntry[]) => void): () => void {
    return this.emitter.on(listener);
  }

  clear(): void {
    this.entries = [];
    this.emitter.emit(this.entries);
  }
}

export const activityStream = new ActivityStream();
