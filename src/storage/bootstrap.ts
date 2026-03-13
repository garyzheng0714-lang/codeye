import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';
import {
  loadSessionSnapshot,
  persistSessionSnapshot,
  type SessionStoreSnapshot,
} from './sessionPersistence';

const PERSIST_DEBOUNCE_MS = 250;

export function hydrateStoresFromPersistence(): void {
  const snapshot = loadSessionSnapshot();
  if (!snapshot) return;

  useSessionStore.setState({
    folders: snapshot.folders,
    sessions: snapshot.sessions,
    activeFolderId: snapshot.activeFolderId,
    activeSessionId: snapshot.activeSessionId,
  });

  const chatStore = useChatStore.getState();
  const activeSession = snapshot.activeSessionId
    ? snapshot.sessions.find((session) => session.id === snapshot.activeSessionId)
    : undefined;

  if (activeSession) {
    chatStore.setSessionId(activeSession.id);
    chatStore.setCwd(activeSession.cwd);
    chatStore.loadSession({
      messages: activeSession.messages,
      cost: activeSession.cost,
      inputTokens: activeSession.inputTokens,
      outputTokens: activeSession.outputTokens,
      claudeSessionId: activeSession.claudeSessionId ?? null,
      model: activeSession.model,
    });
    return;
  }

  const activeFolder = snapshot.activeFolderId
    ? snapshot.folders.find((folder) => folder.id === snapshot.activeFolderId)
    : undefined;

  chatStore.setSessionId(null);
  chatStore.setClaudeSessionId(null);
  chatStore.setCwd(activeFolder?.path ?? '');
}

export function startSessionAutoPersistence(): () => void {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = (snapshot: SessionStoreSnapshot) => {
    persistSessionSnapshot(snapshot);
  };

  const unsubscribe = useSessionStore.subscribe((state) => {
    const snapshot: SessionStoreSnapshot = {
      folders: state.folders,
      sessions: state.sessions,
      activeFolderId: state.activeFolderId,
      activeSessionId: state.activeSessionId,
    };

    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      flush(snapshot);
      persistTimer = null;
    }, PERSIST_DEBOUNCE_MS);
  });

  return () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const state = useSessionStore.getState();
    flush({
      folders: state.folders,
      sessions: state.sessions,
      activeFolderId: state.activeFolderId,
      activeSessionId: state.activeSessionId,
    });
    unsubscribe();
  };
}
