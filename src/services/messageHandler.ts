import type { ToolCallDisplay } from '../types';
import type { ClaudeMessage } from '../types/protocol';

export interface StoreActions {
  appendAssistantContent: (s: string) => void;
  finishStreaming: () => void;
  addToolCall: (t: ToolCallDisplay) => void;
  updateCost: (c: number, i: number, o: number) => void;
  setClaudeSessionId: (id: string) => void;
  setRuntimeSlashCommands?: (payload: { slashCommands?: string[]; skills?: string[] }) => void;
  getLastAssistantContent?: () => string | null;
}

function parseInitArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function handleClaudeMessage(message: ClaudeMessage, actions: StoreActions) {
  if (message.type === 'system' && message.subtype === 'init' && message.session_id) {
    actions.setClaudeSessionId(message.session_id);
    const initRecord = message as unknown as Record<string, unknown>;
    const slashCommands = parseInitArray(initRecord, 'slash_commands');
    const skills = parseInitArray(initRecord, 'skills');
    if (slashCommands.length > 0 || skills.length > 0) {
      actions.setRuntimeSlashCommands?.({ slashCommands, skills });
    }
    return;
  }

  if (message.type === 'assistant' && message.message?.content) {
    for (const block of message.message.content) {
      if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
        actions.appendAssistantContent(block.text);
      }
      if (block.type === 'tool_use' && typeof block.name === 'string' && block.name.length > 0) {
        const toolId =
          typeof block.tool_use_id === 'string' && block.tool_use_id.length > 0
            ? block.tool_use_id
            : crypto.randomUUID();
        const toolInput =
          block.input && typeof block.input === 'object' && !Array.isArray(block.input)
            ? (block.input as Record<string, unknown>)
            : {};

        actions.addToolCall({
          id: toolId,
          name: block.name,
          input: toolInput,
          expanded: false,
        });
      }
    }
  }

  if (message.type === 'result' && message.result) {
    const lastAssistant = actions.getLastAssistantContent?.();
    const isDuplicateResult =
      typeof lastAssistant === 'string' &&
      lastAssistant.trim().length > 0 &&
      lastAssistant.trim() === message.result.trim();

    if (!isDuplicateResult) {
      actions.appendAssistantContent(message.result);
    }
  }

  const costUsd = message.total_cost_usd ?? message.cost_usd;
  const inputToks = message.usage?.input_tokens ?? message.input_tokens;
  const outputToks = message.usage?.output_tokens ?? message.output_tokens;
  if (costUsd !== undefined) {
    actions.updateCost(costUsd || 0, inputToks || 0, outputToks || 0);
  }
}
