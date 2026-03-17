import { createTwoFilesPatch } from 'diff';
import { activityStream, type ActivityEntry } from './activityStream';

const MAX_DIFF_LINES = 500;
const DEBOUNCE_MS = 100;

export interface DiffResult {
  filePath: string;
  fileName: string;
  patch: string;
  isNewFile: boolean;
  addedLines: number;
  removedLines: number;
  truncated: boolean;
}

export type DiffListener = (diff: DiffResult) => void;

function countDiffStats(patch: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of patch.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) added++;
    if (line.startsWith('-') && !line.startsWith('---')) removed++;
  }
  return { added, removed };
}

function truncatePatch(patch: string): { result: string; truncated: boolean } {
  const lines = patch.split('\n');
  if (lines.length <= MAX_DIFF_LINES) return { result: patch, truncated: false };
  return {
    result: lines.slice(0, MAX_DIFF_LINES).join('\n') + '\n... truncated ...',
    truncated: true,
  };
}

function computeDiff(
  filePath: string,
  oldContent: string,
  newContent: string,
): DiffResult {
  const fileName = filePath.split('/').pop() || filePath;
  const isNewFile = oldContent === '';
  const rawPatch = createTwoFilesPatch(filePath, filePath, oldContent, newContent, '', '', { context: 3 });
  const { result: patch, truncated } = truncatePatch(rawPatch);
  const stats = countDiffStats(rawPatch);

  return {
    filePath,
    fileName,
    patch,
    isNewFile,
    addedLines: stats.added,
    removedLines: stats.removed,
    truncated,
  };
}

class DiffService {
  private listeners = new Set<DiffListener>();
  private unsubscribe: (() => void) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingEntry: ActivityEntry | null = null;

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = activityStream.subscribeByType('tool_executed', (entry) => {
      this.handleToolEvent(entry);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingEntry = null;
  }

  onDiff(listener: DiffListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private handleToolEvent(entry: ActivityEntry): void {
    const meta = entry.metadata;
    if (!meta) return;

    const toolName = meta.toolName as string;
    if (toolName !== 'Edit' && toolName !== 'Write') return;

    this.pendingEntry = entry;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      if (this.pendingEntry) {
        this.processEntry(this.pendingEntry);
        this.pendingEntry = null;
      }
    }, DEBOUNCE_MS);
  }

  private processEntry(entry: ActivityEntry): void {
    const meta = entry.metadata;
    if (!meta) return;

    const input = meta.input as Record<string, unknown>;
    const filePath = input.file_path as string | undefined;
    if (!filePath) return;

    const toolName = meta.toolName as string;

    if (toolName === 'Edit') {
      const oldString = typeof input.old_string === 'string' ? input.old_string : '';
      const newString = typeof input.new_string === 'string' ? input.new_string : '';
      const diff = computeDiff(filePath, oldString, newString);
      this.notify(diff);
      return;
    }

    if (toolName === 'Write') {
      const content = typeof input.content === 'string' ? input.content : '';
      // For Write, we show the new file content as all-green diff
      const diff = computeDiff(filePath, '', content);
      this.notify(diff);
      return;
    }
  }

  private notify(diff: DiffResult): void {
    for (const listener of this.listeners) {
      listener(diff);
    }
  }
}

export const diffService = new DiffService();
