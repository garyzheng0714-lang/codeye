import { useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { handleClaudeMessage, type StoreActions } from '../services/messageHandler';
import { getOrCreateWs, sendMessage } from '../services/websocket';

function getActions(): StoreActions {
  const s = useChatStore.getState();
  return {
    appendAssistantContent: s.appendAssistantContent,
    finishStreaming: s.finishStreaming,
    addToolCall: s.addToolCall,
    updateCost: s.updateCost,
    setClaudeSessionId: s.setClaudeSessionId,
  };
}

export function useClaudeChat() {
  useEffect(() => {
    if (window.electronAPI) {
      const removeMessage = window.electronAPI.claude.onMessage((msg) =>
        handleClaudeMessage(msg, getActions())
      );
      const removeComplete = window.electronAPI.claude.onComplete(() =>
        getActions().finishStreaming()
      );
      const removeError = window.electronAPI.claude.onError((err) => {
        const a = getActions();
        a.appendAssistantContent(`\n\n**Error:** ${err}`);
        a.finishStreaming();
      });
      return () => { removeMessage(); removeComplete(); removeError(); };
    }

    const ws = getOrCreateWs();
    if (!ws) return;

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'message') {
          handleClaudeMessage(msg.data, getActions());
        } else if (msg.type === 'complete') {
          getActions().finishStreaming();
        } else if (msg.type === 'error') {
          const a = getActions();
          a.appendAssistantContent(`\n\n**Error:** ${msg.error}`);
          a.finishStreaming();
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, []);

}

export function sendClaudeQuery(
  params: { prompt: string; mode?: string; model?: string; cwd?: string; sessionId?: string }
) {
  if (window.electronAPI) {
    window.electronAPI.claude.query(params);
    return;
  }
  sendMessage({ type: 'query', ...params });
}

export function stopClaude() {
  if (window.electronAPI) {
    window.electronAPI.claude.stop();
    return;
  }
  sendMessage({ type: 'stop' });
}
