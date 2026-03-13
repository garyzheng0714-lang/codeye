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
    sessions: snapshot.sessions,
    activeSessionId: snapshot.activeSessionId,
  });

  if (!snapshot.activeSessionId) return;
  const activeSession = snapshot.sessions.find((session) => session.id === snapshot.activeSessionId);
  if (!activeSession) return;

  const chatStore = useChatStore.getState();
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
}

export function startSessionAutoPersistence(): () => void {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = (snapshot: SessionStoreSnapshot) => {
    persistSessionSnapshot(snapshot);
  };

  const unsubscribe = useSessionStore.subscribe((state) => {
    const snapshot: SessionStoreSnapshot = {
      sessions: state.sessions,
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
      sessions: state.sessions,
      activeSessionId: state.activeSessionId,
    });
    unsubscribe();
  };
}
