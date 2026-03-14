import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';

export function saveCurrentSession() {
  const { messages, cost, inputTokens, outputTokens, model, claudeSessionId, cwd } = useChatStore.getState();
  const { activeSessionId, saveSessionMessages } = useSessionStore.getState();
  if (activeSessionId) {
    saveSessionMessages(activeSessionId, messages, cost, inputTokens, outputTokens, {
      model,
      claudeSessionId,
      cwd,
    });
  }
}
