import { useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { handleClaudeMessage, type StoreActions } from '../services/messageHandler';
import { getOrCreateWs, sendMessage } from '../services/websocket';
import { parseClaudeMessage, parseWsInboundEvent } from '../types/protocol';
import { finishStreamTrace, markStreamChunk } from '../observability/perfBaseline';

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
      const removeMessage = window.electronAPI.claude.onMessage((rawMessage) => {
        const parsed = parseClaudeMessage(rawMessage);
        if (!parsed) return;
        markStreamChunk();
        handleClaudeMessage(parsed, getActions());
      });
      const removeComplete = window.electronAPI.claude.onComplete(() => {
        getActions().finishStreaming();
        finishStreamTrace('completed');
      });
      const removeError = window.electronAPI.claude.onError((err) => {
        const a = getActions();
        a.appendAssistantContent(`\n\n**Error:** ${err}`);
        a.finishStreaming();
        finishStreamTrace('error');
      });
      return () => { removeMessage(); removeComplete(); removeError(); };
    }

    const ws = getOrCreateWs();
    if (!ws) return;

    const handler = (event: MessageEvent) => {
      try {
        const raw = JSON.parse(event.data);
        const msg = parseWsInboundEvent(raw);
        if (!msg) return;

        if (msg.type === 'message') {
          markStreamChunk();
          handleClaudeMessage(msg.data, getActions());
        } else if (msg.type === 'complete') {
          getActions().finishStreaming();
          finishStreamTrace('completed');
        } else if (msg.type === 'error') {
          const a = getActions();
          a.appendAssistantContent(`\n\n**Error:** ${msg.error}`);
          a.finishStreaming();
          finishStreamTrace('error');
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
  finishStreamTrace('aborted');
  if (window.electronAPI) {
    window.electronAPI.claude.stop();
    return;
  }
  sendMessage({ type: 'stop' });
}
