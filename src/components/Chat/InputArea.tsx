import { useState, useRef, useCallback, useMemo } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import { sendClaudeQuery, stopClaude } from '../../hooks/useClaudeChat';
import { saveCurrentSession } from '../../utils/session';
import SlashCommandPalette from './SlashCommandPalette';
import ModelConfigSelector from './ModelConfigSelector';
import SessionStats from './SessionStats';
import type { SlashCommand } from '../../data/slashCommands';
import type { ModelId, EffortLevel } from '../../types';
import { startStreamTrace } from '../../observability/perfBaseline';
import { parseContextReferences, CONTEXT_SUGGESTIONS, type ContextReference } from '../../services/contextReferences';

export default function InputArea() {
  const [input, setInput] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [showContextSuggestions, setShowContextSuggestions] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, addUserMessage, startAssistantMessage, mode, setMode, setModel, setEffort, clearMessages } = useChatStore();
  const { activeSessionId, createSession } = useSessionStore();

  const contextRefs = useMemo(() => parseContextReferences(input), [input]);

  const handleSend = useCallback(() => {
    const dispatchStart = performance.now();
    const text = input.trim();
    if (!text || isStreaming) return;

    if (!activeSessionId) {
      const preview = text.length > 30 ? text.slice(0, 30) + '...' : text;
      createSession(preview);
    }

    addUserMessage(text);
    startAssistantMessage();
    setInput('');
    setShowPalette(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const state = useChatStore.getState();
    startStreamTrace({
      mode,
      model: state.model,
      transport: window.electronAPI ? 'electron' : 'ws',
      inputDispatchMs: Number((performance.now() - dispatchStart).toFixed(2)),
    });
    sendClaudeQuery({
      prompt: text,
      mode,
      model: state.model,
      effort: state.effort,
      cwd: state.cwd || undefined,
      sessionId: state.claudeSessionId || undefined,
    });
  }, [input, isStreaming, addUserMessage, startAssistantMessage, mode, activeSessionId, createSession]);

  const handleCommandSelect = useCallback((command: SlashCommand) => {
    setShowPalette(false);

    if (command.category === 'mode') {
      setMode(command.name as 'chat' | 'code' | 'plan');
      setInput('');
      textareaRef.current?.focus();
      return;
    }

    if (command.category === 'model') {
      const modelMap: Record<string, ModelId> = {
        opus: 'claude-opus-4-6',
        sonnet: 'claude-sonnet-4-6',
        haiku: 'claude-haiku-4-5',
      };
      if (modelMap[command.name]) {
        setModel(modelMap[command.name]);
      }
      setInput('');
      textareaRef.current?.focus();
      return;
    }

    if (command.category === 'effort') {
      const effortMap: Record<string, EffortLevel> = {
        'think-low': 'low',
        'think-med': 'medium',
        'think-high': 'high',
        'think-max': 'max',
      };
      if (effortMap[command.name]) {
        setEffort(effortMap[command.name]);
      }
      setInput('');
      textareaRef.current?.focus();
      return;
    }

    if (command.category === 'action') {
      if (command.name === 'clear') {
        clearMessages();
        setInput('');
        return;
      }
      if (command.name === 'new') {
        saveCurrentSession();
        clearMessages();
        createSession();
        setInput('');
        return;
      }
      setInput(`/${command.name} `);
      textareaRef.current?.focus();
      return;
    }

    // Skills: insert as prompt and send
    const prompt = `/${command.name}`;
    const dispatchStart = performance.now();
    setInput('');

    if (!activeSessionId) {
      createSession(prompt);
    }

    addUserMessage(prompt);
    startAssistantMessage();

    const state = useChatStore.getState();
    startStreamTrace({
      mode,
      model: state.model,
      transport: window.electronAPI ? 'electron' : 'ws',
      inputDispatchMs: Number((performance.now() - dispatchStart).toFixed(2)),
    });
    sendClaudeQuery({
      prompt,
      mode,
      model: state.model,
      effort: state.effort,
      cwd: state.cwd || undefined,
      sessionId: state.claudeSessionId || undefined,
    });
  }, [setMode, setModel, setEffort, clearMessages, createSession, activeSessionId, addUserMessage, startAssistantMessage, mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showPalette) {
      // Let the palette handle arrow/enter/escape
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Detect slash at beginning
    if (value.startsWith('/')) {
      const query = value.slice(1);
      setSlashQuery(query);
      setShowPalette(true);
      setShowContextSuggestions(false);
    } else {
      setShowPalette(false);
      setSlashQuery('');
    }

    // Detect # for context references
    const cursorPos = e.target.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const hashMatch = beforeCursor.match(/#(\w*)$/);
    setShowContextSuggestions(!!hashMatch && !value.startsWith('/'));

    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const handleStop = () => {
    stopClaude();
  };

  const placeholders = {
    chat: 'Ask a question...   Enter to send · / for commands',
    code: 'Describe what to build...   Enter to send · / for commands',
    plan: 'Describe what to plan...   Enter to send · / for commands',
  };

  const handleContextSelect = (suggestion: typeof CONTEXT_SUGGESTIONS[number]) => {
    const cursorPos = textareaRef.current?.selectionStart ?? input.length;
    const beforeCursor = input.slice(0, cursorPos);
    const afterCursor = input.slice(cursorPos);
    const hashIdx = beforeCursor.lastIndexOf('#');
    const newInput = beforeCursor.slice(0, hashIdx) + suggestion.trigger + ' ' + afterCursor;
    setInput(newInput);
    setShowContextSuggestions(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="input-area">
      <div className="input-container-wrapper">
        <SlashCommandPalette
          query={slashQuery}
          visible={showPalette}
          onSelect={handleCommandSelect}
          onClose={() => setShowPalette(false)}
        />
        {showContextSuggestions && (
          <div className="context-suggestions">
            {CONTEXT_SUGGESTIONS.map((s) => (
              <button
                key={s.type}
                className="context-suggestion-item"
                onClick={() => handleContextSelect(s)}
              >
                <span className="context-suggestion-trigger">{s.trigger}</span>
                <span className="context-suggestion-desc">{s.description}</span>
              </button>
            ))}
          </div>
        )}
        {contextRefs.length > 0 && (
          <div className="context-pills">
            {contextRefs.map((ref, i) => (
              <span key={`${ref.type}-${ref.value}-${i}`} className="context-pill">
                {ref.displayLabel}
              </span>
            ))}
          </div>
        )}
        <div className="input-container">
          <textarea
            ref={textareaRef}
            className="input-textarea"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholders[mode]}
            rows={1}
            disabled={isStreaming}
          />
          <div className="input-actions">
            {isStreaming ? (
              <button className="stop-btn" onClick={handleStop} title="Stop">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
                </svg>
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!input.trim()}
                title="Send (Enter)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 13L13 8L3 3v4l6 1-6 1v4z" fill="currentColor" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="input-footer">
          <div className="input-footer-left" />
          <div className="input-footer-right">
            <ModelConfigSelector />
            <SessionStats />
          </div>
        </div>
      </div>
    </div>
  );
}
