import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { subscribeWsMessages, sendMessage } from '../services/websocket';
import { parseStreamEvent } from '../types/streamEvent';

interface GitStatusSnapshot {
  available: boolean;
  cwd: string;
  branch: string | null;
  dirty: boolean;
  ahead: number;
  behind: number;
  files: Array<{ path: string; status: string }>;
}

const EMPTY_GIT_STATUS: GitStatusSnapshot = {
  available: false,
  cwd: '',
  branch: null,
  dirty: false,
  ahead: 0,
  behind: 0,
  files: [],
};

function normalizeWorkspacePath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed === '/') return '/';
  return trimmed.replace(/[\\/]+$/, '');
}

async function createWorkspaceFingerprint(
  workspaceRoot: string,
  cwd: string
): Promise<string> {
  const source = `${workspaceRoot}\n${cwd}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(source);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export function useGitStatus() {
  const cwd = useChatStore((s) => s.cwd);
  const [status, setStatus] = useState<GitStatusSnapshot>(EMPTY_GIT_STATUS);
  const [loading, setLoading] = useState(false);
  const latestCorrelationIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!cwd) {
      setStatus({ ...EMPTY_GIT_STATUS, cwd: cwd || '' });
      return;
    }

    if (window.electronAPI) {
      setLoading(true);
      try {
        const next = await window.electronAPI.projects.getGitStatus(cwd);
        setStatus({
          available: next.available,
          cwd: next.cwd,
          branch: next.branch,
          dirty: next.dirty,
          ahead: next.ahead,
          behind: next.behind,
          files: [],
        });
      } catch {
        setStatus({ ...EMPTY_GIT_STATUS, cwd });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!globalThis.crypto?.subtle) {
      setStatus({ ...EMPTY_GIT_STATUS, cwd });
      return;
    }

    const normalizedCwd = normalizeWorkspacePath(cwd);
    const workspaceRoot = normalizedCwd;
    const requestId = crypto.randomUUID();
    const correlationId = crypto.randomUUID();
    latestCorrelationIdRef.current = correlationId;

    setLoading(true);

    try {
      const workspaceFingerprint = await createWorkspaceFingerprint(
        workspaceRoot,
        normalizedCwd
      );

      sendMessage({
        version: 1,
        type: 'git_status_request',
        correlationId,
        payload: {
          requestId,
          cwd: normalizedCwd,
          workspaceRoot,
          workspaceFingerprint,
        },
      });
    } catch {
      latestCorrelationIdRef.current = null;
      setLoading(false);
      setStatus({ ...EMPTY_GIT_STATUS, cwd });
    }
  }, [cwd]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!cwd) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 15_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [cwd, refresh]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh]);

  useEffect(() => {
    if (window.electronAPI) return;
    const unsubscribe = subscribeWsMessages((event) => {
      try {
        const raw = JSON.parse(event.data);
        const streamEvent = parseStreamEvent(raw);
        if (!streamEvent) return;

        if (streamEvent.type === 'git_status') {
          if (
            streamEvent.correlationId &&
            streamEvent.correlationId !== latestCorrelationIdRef.current
          ) {
            return;
          }
          setStatus({
            available: streamEvent.payload.available,
            cwd,
            branch: streamEvent.payload.branch,
            dirty: streamEvent.payload.dirty,
            ahead: streamEvent.payload.ahead,
            behind: streamEvent.payload.behind,
            files: streamEvent.payload.files,
          });
          latestCorrelationIdRef.current = null;
          setLoading(false);
          return;
        }

        if (
          streamEvent.type === 'git_commit_result' ||
          streamEvent.type === 'git_push_result' ||
          streamEvent.type === 'git_pr_result'
        ) {
          void refresh();
          return;
        }

        if (
          streamEvent.type === 'error' &&
          streamEvent.correlationId &&
          streamEvent.correlationId === latestCorrelationIdRef.current
        ) {
          latestCorrelationIdRef.current = null;
          setLoading(false);
        }
      } catch {
        // ignore malformed messages
      }
    });

    return () => {
      unsubscribe();
    };
  }, [cwd, refresh]);

  return {
    cwd,
    loading,
    status,
    refresh,
  };
}
