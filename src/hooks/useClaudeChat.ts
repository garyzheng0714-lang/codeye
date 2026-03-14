import { useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { handleClaudeMessage, type StoreActions } from '../services/messageHandler';
import { subscribeWsMessages, sendMessage } from '../services/websocket';
import { parseClaudeMessage } from '../types/protocol';
import { parseStreamEvent } from '../types/streamEvent';
import { finishStreamTrace, markStreamChunk } from '../observability/perfBaseline';
import { StreamBatcher } from '../services/streamBatcher';
import { getEffectiveEffort, normalizeModelId, toCliModelId } from '../data/models';
import { setRuntimeSlashCommands } from '../data/slashCommands';
import { useUIStore } from '../stores/uiStore';
import { toCliPermissionMode } from '../services/permissionMode';

function getActions(): StoreActions {
  const s = useChatStore.getState();
  return {
    appendAssistantContent: s.appendAssistantContent,
    finishStreaming: s.finishStreaming,
    addToolCall: s.addToolCall,
    updateCost: s.updateCost,
    setClaudeSessionId: s.setClaudeSessionId,
    setRuntimeSlashCommands,
    getLastAssistantContent: () => {
      const last = s.messages[s.messages.length - 1];
      if (last?.role !== 'assistant') return null;
      return last.content;
    },
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
          const costUsd = parsed.total_cost_usd ?? parsed.cost_usd;
          const inputToks = parsed.usage?.input_tokens ?? parsed.input_tokens;
          const outputToks = parsed.usage?.output_tokens ?? parsed.output_tokens;
          if (costUsd !== undefined) {
            actions.updateCost(costUsd || 0, inputToks || 0, outputToks || 0);
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
            const wsCost = msg.total_cost_usd ?? msg.cost_usd;
            const wsInput = msg.usage?.input_tokens ?? msg.input_tokens;
            const wsOutput = msg.usage?.output_tokens ?? msg.output_tokens;
            if (wsCost !== undefined) {
              actions.updateCost(wsCost || 0, wsInput || 0, wsOutput || 0);
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

    const unsubscribe = subscribeWsMessages(handler);
    return () => { textBatcher.destroy(); unsubscribe(); };
  }, []);

}

export function sendClaudeQuery(
  params: {
    prompt: string;
    mode?: string;
    model?: string;
    effort?: string;
    cwd?: string;
    sessionId?: string;
    permissionMode?: string;
  }
) {
  const normalizedModel = normalizeModelId(params.model);
  const model = toCliModelId(normalizedModel);
  const effort = getEffectiveEffort(normalizedModel, params.effort);
  const uiPermissionMode = useUIStore.getState().permissionMode;
  const permissionMode = toCliPermissionMode(params.permissionMode ?? uiPermissionMode);
  const sanitizedParams = {
    ...params,
    model,
    effort,
    permissionMode,
  };

  console.log('[sendClaudeQuery]', { hasElectronAPI: !!window.electronAPI, params: sanitizedParams });
  if (window.electronAPI) {
    console.log('[sendClaudeQuery] calling electronAPI.claude.query');
    window.electronAPI.claude.query(sanitizedParams);
    return;
  }
  sendMessage({ type: 'query', ...sanitizedParams });
}

export function stopClaude() {
  finishStreamTrace('aborted');
  if (window.electronAPI) {
    window.electronAPI.claude.stop();
    return;
  }
  sendMessage({ type: 'stop' });
}
