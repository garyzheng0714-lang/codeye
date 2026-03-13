import { useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { handleClaudeMessage, type StoreActions } from '../services/messageHandler';
import { getOrCreateWs, sendMessage } from '../services/websocket';
import { parseClaudeMessage } from '../types/protocol';
import { parseStreamEvent } from '../types/streamEvent';
import { finishStreamTrace, markStreamChunk } from '../observability/perfBaseline';
import { StreamBatcher } from '../services/streamBatcher';

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
  const batcherRef = useRef<StreamBatcher | null>(null);

  useEffect(() => {
    const textBatcher = new StreamBatcher((chunks) => {
      const combined = chunks.join('');
      if (combined) {
        useChatStore.getState().appendAssistantContent(combined);
      }
    });
    batcherRef.current = textBatcher;

    if (window.electronAPI) {
      const removeMessage = window.electronAPI.claude.onMessage((rawMessage) => {
        const parsed = parseClaudeMessage(rawMessage);
        if (!parsed) return;
        markStreamChunk();
        if (parsed.type === 'assistant' && parsed.message?.content) {
          for (const block of parsed.message.content) {
            if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
              textBatcher.push(block.text);
            }
          }
          const actions = getActions();
          for (const block of parsed.message.content) {
            if (block.type === 'tool_use' && typeof block.name === 'string' && block.name.length > 0) {
              textBatcher.flush();
              const toolId = typeof block.tool_use_id === 'string' && block.tool_use_id.length > 0
                ? block.tool_use_id : crypto.randomUUID();
              const toolInput = block.input && typeof block.input === 'object' && !Array.isArray(block.input)
                ? (block.input as Record<string, unknown>) : {};
              actions.addToolCall({ id: toolId, name: block.name, input: toolInput, expanded: false });
            }
          }
          if (parsed.cost_usd !== undefined) {
            actions.updateCost(parsed.cost_usd || 0, parsed.input_tokens || 0, parsed.output_tokens || 0);
          }
        } else {
          textBatcher.flush();
          handleClaudeMessage(parsed, getActions());
        }
      });
      const removeComplete = window.electronAPI.claude.onComplete(() => {
        textBatcher.flush();
        getActions().finishStreaming();
        finishStreamTrace('completed');
      });
      const removeError = window.electronAPI.claude.onError((err) => {
        textBatcher.flush();
        const a = getActions();
        a.appendAssistantContent(`\n\n**Error:** ${err}`);
        a.finishStreaming();
        finishStreamTrace('error');
      });
      return () => { textBatcher.destroy(); removeMessage(); removeComplete(); removeError(); };
    }

    const ws = getOrCreateWs();
    if (!ws) return () => { textBatcher.destroy(); };

    const handler = (event: MessageEvent) => {
      try {
        const raw = JSON.parse(event.data);
        const streamEvent = parseStreamEvent(raw);
        if (!streamEvent) return;

        if (streamEvent.type === 'message') {
          markStreamChunk();
          const msg = streamEvent.payload.data;
          if (msg.type === 'assistant' && msg.message?.content) {
            for (const block of msg.message.content) {
              if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
                textBatcher.push(block.text);
              }
            }
            const actions = getActions();
            for (const block of msg.message.content) {
              if (block.type === 'tool_use' && typeof block.name === 'string' && block.name.length > 0) {
                textBatcher.flush();
                const toolId = typeof block.tool_use_id === 'string' && block.tool_use_id.length > 0
                  ? block.tool_use_id : crypto.randomUUID();
                const toolInput = block.input && typeof block.input === 'object' && !Array.isArray(block.input)
                  ? (block.input as Record<string, unknown>) : {};
                actions.addToolCall({ id: toolId, name: block.name, input: toolInput, expanded: false });
              }
            }
            if (msg.cost_usd !== undefined) {
              actions.updateCost(msg.cost_usd || 0, msg.input_tokens || 0, msg.output_tokens || 0);
            }
          } else {
            textBatcher.flush();
            handleClaudeMessage(msg, getActions());
          }
        } else if (streamEvent.type === 'complete') {
          textBatcher.flush();
          getActions().finishStreaming();
          finishStreamTrace('completed');
        } else if (streamEvent.type === 'error') {
          textBatcher.flush();
          const a = getActions();
          a.appendAssistantContent(`\n\n**Error:** ${streamEvent.payload.error}`);
          a.finishStreaming();
          finishStreamTrace('error');
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.addEventListener('message', handler);
    return () => { textBatcher.destroy(); ws.removeEventListener('message', handler); };
  }, []);

}

export function sendClaudeQuery(
  params: { prompt: string; mode?: string; model?: string; effort?: string; cwd?: string; sessionId?: string }
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
