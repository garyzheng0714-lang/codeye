import { useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import type { ToolCallDisplay } from '../stores/chatStore';

const WS_URL = 'ws://localhost:5174';
const RECONNECT_DELAY = 2000;

interface StoreActions {
  appendAssistantContent: (s: string) => void;
  finishStreaming: () => void;
  addToolCall: (t: ToolCallDisplay) => void;
  updateCost: (c: number, i: number, o: number) => void;
  setClaudeSessionId: (id: string) => void;
}

function handleClaudeMessage(message: ClaudeMessage, actions: StoreActions) {
  if (message.type === 'system' && message.subtype === 'init' && message.session_id) {
    actions.setClaudeSessionId(message.session_id);
    return;
  }

  if (message.type === 'assistant' && message.message?.content) {
    for (const block of message.message.content) {
      if (block.type === 'text' && block.text) {
        actions.appendAssistantContent(block.text);
      }
      if (block.type === 'tool_use' && block.name) {
        actions.addToolCall({
          id: block.tool_use_id || crypto.randomUUID(),
          name: block.name,
          input: block.input || {},
          expanded: false,
        });
      }
    }
  }

  if (message.type === 'result' && message.result) {
    actions.appendAssistantContent(message.result);
  }

  if (message.cost_usd !== undefined) {
    actions.updateCost(message.cost_usd || 0, message.input_tokens || 0, message.output_tokens || 0);
  }
}

// Singleton WebSocket with auto-reconnect
let globalWs: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getOrCreateWs(): WebSocket | null {
  if (window.electronAPI) return null;
  if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) {
    return globalWs;
  }
  return connectWs();
}

function connectWs(): WebSocket {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const ws = new WebSocket(WS_URL);
  globalWs = ws;

  ws.onclose = () => {
    reconnectTimer = setTimeout(() => connectWs(), RECONNECT_DELAY);
  };

  ws.onerror = () => {
    // onclose will fire after this
  };

  return ws;
}

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
  const wsRef = useRef<WebSocket | null>(null);

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
    wsRef.current = ws;

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

  return wsRef;
}

export function sendClaudeQuery(
  params: { prompt: string; mode?: string; model?: string; cwd?: string; sessionId?: string }
) {
  if (window.electronAPI) {
    window.electronAPI.claude.query(params);
    return;
  }

  const ws = getOrCreateWs();
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'query', ...params }));
  } else {
    const onOpen = () => {
      ws?.send(JSON.stringify({ type: 'query', ...params }));
      ws?.removeEventListener('open', onOpen);
    };
    ws?.addEventListener('open', onOpen);
  }
}

export function stopClaude() {
  if (window.electronAPI) {
    window.electronAPI.claude.stop();
    return;
  }

  const ws = getOrCreateWs();
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'stop' }));
  }
}
