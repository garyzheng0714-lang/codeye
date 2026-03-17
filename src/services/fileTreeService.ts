interface CacheEntry {
  entries: FileTreeEntry[];
  ts: number;
}

const CACHE_TTL = 30_000;
const cache = new Map<string, CacheEntry>();

export async function readDirectory(dirPath: string): Promise<FileTreeEntry[]> {
  const cached = cache.get(dirPath);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.entries;
  }

  if (!window.electronAPI?.fileTree) {
    return [];
  }

  const entries = await window.electronAPI.fileTree.readDir(dirPath);
  cache.set(dirPath, { entries, ts: Date.now() });
  return entries;
}

export function invalidateCache(dirPath?: string): void {
  if (dirPath) {
    cache.delete(dirPath);
  } else {
    cache.clear();
  }
}
