import { useCallback, useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';

interface GitStatusSnapshot {
  available: boolean;
  cwd: string;
  branch: string | null;
  dirty: boolean;
  ahead: number;
  behind: number;
}

const EMPTY_GIT_STATUS: GitStatusSnapshot = {
  available: false,
  cwd: '',
  branch: null,
  dirty: false,
  ahead: 0,
  behind: 0,
};

export function useGitStatus() {
  const cwd = useChatStore((s) => s.cwd);
  const [status, setStatus] = useState<GitStatusSnapshot>(EMPTY_GIT_STATUS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.electronAPI || !cwd) {
      setStatus({ ...EMPTY_GIT_STATUS, cwd: cwd || '' });
      return;
    }

    setLoading(true);
    try {
      const next = await window.electronAPI.projects.getGitStatus(cwd);
      setStatus(next);
    } catch {
      setStatus({ ...EMPTY_GIT_STATUS, cwd });
    } finally {
      setLoading(false);
    }
  }, [cwd]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!window.electronAPI || !cwd) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 15_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [cwd, refresh]);

  return {
    cwd,
    loading,
    status,
    refresh,
  };
}
