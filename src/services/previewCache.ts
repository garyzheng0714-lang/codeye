export interface PreviewEntry {
  type: 'file' | 'diff';
  content: string;
  path?: string;
}

interface CacheRecord {
  entry: PreviewEntry;
  accessedAt: number;
}

export class PreviewCache {
  private store = new Map<string, CacheRecord>();
  private maxSize: number;
  private ttlMs: number;

  constructor(opts: { maxSize: number; ttlMs: number }) {
    this.maxSize = opts.maxSize;
    this.ttlMs = opts.ttlMs;
  }

  get(key: string): PreviewEntry | null {
    const record = this.store.get(key);
    if (!record) return null;
    if (Date.now() - record.accessedAt > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    record.accessedAt = Date.now();
    return record.entry;
  }

  set(key: string, entry: PreviewEntry): void {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldest = [...this.store.entries()].sort((a, b) => a[1].accessedAt - b[1].accessedAt)[0];
      if (oldest) this.store.delete(oldest[0]);
    }
    this.store.set(key, { entry, accessedAt: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }
}

export const previewCache = new PreviewCache({ maxSize: 100, ttlMs: 60_000 });
