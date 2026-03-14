import { describe, it, expect, vi } from 'vitest';
import { handleClaudeMessage, type StoreActions } from './messageHandler';

function createMockActions(): StoreActions {
  return {
    appendAssistantContent: vi.fn(),
    finishStreaming: vi.fn(),
    addToolCall: vi.fn(),
    updateCost: vi.fn(),
    setClaudeSessionId: vi.fn(),
    setRuntimeSlashCommands: vi.fn(),
    getLastAssistantContent: vi.fn(() => null),
  };
}

describe('handleClaudeMessage', () => {
  it('handles system init message with session_id', () => {
    const actions = createMockActions();
    handleClaudeMessage(
      { type: 'system', subtype: 'init', session_id: 'sess-123' },
      actions
    );
    expect(actions.setClaudeSessionId).toHaveBeenCalledWith('sess-123');
  });

  it('extracts slash_commands and skills from init message', () => {
    const actions = createMockActions();
    handleClaudeMessage(
      {
        type: 'system',
        subtype: 'init',
        session_id: 'sess-456',
        slash_commands: ['review', 'plugin:run'],
        skills: ['agent-reach'],
      },
      actions
    );

    expect(actions.setRuntimeSlashCommands).toHaveBeenCalledWith({
      slashCommands: ['review', 'plugin:run'],
      skills: ['agent-reach'],
    });
  });

  it('handles assistant text content', () => {
    const actions = createMockActions();
    handleClaudeMessage(
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      },
      actions
    );
    expect(actions.appendAssistantContent).toHaveBeenCalledWith('Hello world');
  });

  it('handles assistant tool_use content', () => {
    const actions = createMockActions();
    handleClaudeMessage(
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              tool_use_id: 'tool-1',
              name: 'Read',
              input: { file_path: '/test.ts' },
            },
          ],
        },
      },
      actions
    );
    expect(actions.addToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tool-1',
        name: 'Read',
        input: { file_path: '/test.ts' },
        expanded: false,
      })
    );
  });

  it('handles result message', () => {
    const actions = createMockActions();
    handleClaudeMessage(
      { type: 'result', result: 'Done!' },
      actions
    );
    expect(actions.appendAssistantContent).toHaveBeenCalledWith('Done!');
  });

  it('handles cost tracking', () => {
    const actions = createMockActions();
    handleClaudeMessage(
      { type: 'result', cost_usd: 0.005, input_tokens: 100, output_tokens: 50 },
      actions
    );
    expect(actions.updateCost).toHaveBeenCalledWith(0.005, 100, 50);
  });

  it('skips duplicate result text when assistant content already matches', () => {
    const actions = createMockActions();
    (actions.getLastAssistantContent as ReturnType<typeof vi.fn>).mockReturnValue('Done!');

    handleClaudeMessage(
      { type: 'result', result: 'Done!' },
      actions
    );

    expect(actions.appendAssistantContent).not.toHaveBeenCalled();
  });

  it('still appends result text when assistant content differs', () => {
    const actions = createMockActions();
    (actions.getLastAssistantContent as ReturnType<typeof vi.fn>).mockReturnValue('Working...');

    handleClaudeMessage(
      { type: 'result', result: 'Done!' },
      actions
    );

    expect(actions.appendAssistantContent).toHaveBeenCalledWith('Done!');
  });

  it('ignores messages with no matching type', () => {
    const actions = createMockActions();
    handleClaudeMessage({ type: 'unknown' }, actions);
    expect(actions.appendAssistantContent).not.toHaveBeenCalled();
    expect(actions.addToolCall).not.toHaveBeenCalled();
    expect(actions.setClaudeSessionId).not.toHaveBeenCalled();
  });

  it('handles multiple content blocks in one message', () => {
    const actions = createMockActions();
    handleClaudeMessage(
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Part 1' },
            { type: 'text', text: 'Part 2' },
            { type: 'tool_use', tool_use_id: 't1', name: 'Bash', input: { command: 'ls' } },
          ],
        },
      },
      actions
    );
    expect(actions.appendAssistantContent).toHaveBeenCalledTimes(2);
    expect(actions.addToolCall).toHaveBeenCalledTimes(1);
  });
});
