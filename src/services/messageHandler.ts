import type { ToolCallDisplay } from '../types';
import type { ClaudeMessage } from '../types/protocol';

export interface StoreActions {
  appendAssistantContent: (s: string) => void;
  finishStreaming: () => void;
  addToolCall: (t: ToolCallDisplay) => void;
  updateToolResult: (toolId: string, output: string) => void;
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

function extractContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (block): block is { type: string; text: string } =>
          typeof block === 'object' &&
          block !== null &&
          block.type === 'text' &&
          typeof block.text === 'string',
      )
      .map((block) => block.text)
      .join('\n');
  }
  return '';
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

  // CLI stream-json: tool results arrive as type="user" with tool_result content blocks
  if (message.type === 'user' && message.message?.content) {
    const record = message as unknown as Record<string, unknown>;
    const toolUseResult = record.tool_use_result as Record<string, unknown> | undefined;

    for (const block of message.message.content) {
      if (block.type === 'tool_result') {
        const toolUseId = typeof block.tool_use_id === 'string' ? block.tool_use_id : '';
        if (!toolUseId) continue;

        // Prefer structured tool_use_result.file.content, fall back to block.content
        let content = '';
        if (toolUseResult && typeof toolUseResult === 'object') {
          const file = toolUseResult.file as Record<string, unknown> | undefined;
          if (file && typeof file.content === 'string') {
            content = file.content;
          }
        }
        if (!content) {
          content = extractContentText((block as Record<string, unknown>).content);
        }
        if (content) {
          actions.updateToolResult(toolUseId, content);
        }
      }
    }
    return;
  }

  // Legacy: tool_result as top-level type (backward compat)
  if (message.type === 'tool_result' || (message.type === 'assistant' && message.message?.role === 'tool')) {
    const record = message as unknown as Record<string, unknown>;
    const toolUseId = typeof record.tool_use_id === 'string' ? record.tool_use_id : '';
    const content = extractContentText(record.content)
      || (typeof record.output === 'string' ? record.output : '');
    if (toolUseId) {
      actions.updateToolResult(toolUseId, content);
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
