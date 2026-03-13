import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';

export function saveCurrentSession() {
  const { messages, cost, inputTokens, outputTokens, model } = useChatStore.getState();
  const { activeSessionId, saveSessionMessages } = useSessionStore.getState();
  if (activeSessionId && messages.length > 0) {
    saveSessionMessages(activeSessionId, messages, cost, inputTokens, outputTokens, model);
  }
}
