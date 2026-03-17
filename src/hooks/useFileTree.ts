import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useChatStore } from '../stores/chatStore';
import { readDirectory, invalidateCache } from '../services/fileTreeService';

interface UseFileTreeReturn {
  rootPath: string | null;
  nodes: Map<string, FileTreeEntry[]>;
  expandedPaths: Set<string>;
  loadingPaths: Set<string>;
  toggleExpand: (dirPath: string) => void;
  refresh: () => void;
  isLoading: boolean;
}

export function useFileTree(): UseFileTreeReturn {
  const folders = useSessionStore((s) => s.folders);
  const activeFolderId = useSessionStore((s) => s.activeFolderId);
  const cwd = useChatStore((s) => s.cwd);

  const rootPath = useMemo(() => {
    const folder = folders.find((f) => f.id === activeFolderId);
    return folder?.path || cwd || null;
  }, [folders, activeFolderId, cwd]);

  const [nodes, setNodes] = useState<Map<string, FileTreeEntry[]>>(new Map());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadDir = useCallback(async (dirPath: string) => {
    const entries = await readDirectory(dirPath);
    if (!mountedRef.current) return;
    setNodes((prev) => {
      const next = new Map(prev);
      next.set(dirPath, entries);
      return next;
    });
    return entries;
  }, []);

  useEffect(() => {
    if (!rootPath) {
      setNodes(new Map());
      setExpandedPaths(new Set());
      return;
    }

    setIsLoading(true);
    setNodes(new Map());
    setExpandedPaths(new Set());

    loadDir(rootPath).finally(() => {
      if (mountedRef.current) setIsLoading(false);
    });
  }, [rootPath, loadDir]);

  const toggleExpand = useCallback((dirPath: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
        return next;
      }
      next.add(dirPath);
      return next;
    });

    if (!nodesRef.current.has(dirPath)) {
      setLoadingPaths((prev) => new Set(prev).add(dirPath));
      loadDir(dirPath).finally(() => {
        if (mountedRef.current) {
          setLoadingPaths((prev) => {
            const next = new Set(prev);
            next.delete(dirPath);
            return next;
          });
        }
      });
    }
  }, [loadDir]);

  const refresh = useCallback(() => {
    if (!rootPath) return;
    invalidateCache();
    setIsLoading(true);

    const pathsToReload = [rootPath, ...expandedPaths];
    Promise.all(pathsToReload.map((p) => loadDir(p))).finally(() => {
      if (mountedRef.current) setIsLoading(false);
    });
  }, [rootPath, expandedPaths, loadDir]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && rootPath) {
        invalidateCache();
        loadDir(rootPath);
        for (const p of expandedPaths) {
          loadDir(p);
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [rootPath, expandedPaths, loadDir]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('codeye:refresh-file-tree', handler);
    return () => window.removeEventListener('codeye:refresh-file-tree', handler);
  }, [refresh]);

  return { rootPath, nodes, expandedPaths, loadingPaths, toggleExpand, refresh, isLoading };
}
