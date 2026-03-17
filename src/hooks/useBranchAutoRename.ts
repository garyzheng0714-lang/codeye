import { useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';
import { suggestBranchName, resolveBranchConflict } from '../services/gitIntegration';

/**
 * Auto-renames the git branch after the first user message in a session.
 * Extracts branch name from the message content.
 * Runs at most once per session.
 */
export function useBranchAutoRename(): void {
  const renamedSessionRef = useRef<string | null>(null);
  const messages = useChatStore((s) => s.messages);

  useEffect(() => {
    const firstUserMsg = messages.find((m) => m.role === 'user');
    if (!firstUserMsg) return;

    const sessionState = useSessionStore.getState();
    const currentSession = sessionState.activeSessionId
      ? sessionState.getSession(sessionState.activeSessionId)
      : undefined;

    if (
      !currentSession?.branch ||
      renamedSessionRef.current === currentSession.id ||
      !window.electronAPI?.projects.renameBranch
    ) {
      return;
    }

    const folder = sessionState.getFolder(currentSession.folderId);
    if (folder?.kind !== 'local' || !folder.path) return;

    renamedSessionRef.current = currentSession.id;
    const oldBranch = currentSession.branch;
    const prompt = firstUserMsg.content;

    void (async () => {
      try {
        const branches = await window.electronAPI!.projects.listBranches(folder.path);
        const newName = resolveBranchConflict(suggestBranchName(prompt), branches);
        const result = await window.electronAPI!.projects.renameBranch(folder.path, oldBranch, newName);
        if (result.success) {
          useSessionStore.getState().updateSessionBranch(currentSession.id, newName);
        }
      } catch (err) {
        renamedSessionRef.current = null;
        console.warn('[git] Branch rename error:', err);
      }
    })();
  }, [messages]);
}
