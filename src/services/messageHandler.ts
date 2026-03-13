import type { ToolCallDisplay } from '../types';

export interface StoreActions {
  appendAssistantContent: (s: string) => void;
  finishStreaming: () => void;
  addToolCall: (t: ToolCallDisplay) => void;
  updateCost: (c: number, i: number, o: number) => void;
  setClaudeSessionId: (id: string) => void;
}

export function handleClaudeMessage(message: ClaudeMessage, actions: StoreActions) {
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
