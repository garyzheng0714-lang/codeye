import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import { sendClaudeQuery, stopClaude } from '../../hooks/useClaudeChat';
import { saveCurrentSession } from '../../utils/session';
import SlashCommandPalette from './SlashCommandPalette';
import ModelConfigSelector from './ModelConfigSelector';
import SessionStats from './SessionStats';
import { filterCommands, getSlashCommandByName, type SlashCommand } from '../../data/slashCommands';
import type { ModelId, EffortLevel } from '../../types';
import { startStreamTrace } from '../../observability/perfBaseline';
import { parseContextReferences, CONTEXT_SUGGESTIONS } from '../../services/contextReferences';

const OPEN_SLASH_EVENT = 'codeye:open-slash-command';
const MAX_INPUT_HEIGHT = 200;

export default function InputArea() {
  const [input, setInput] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [showContextSuggestions, setShowContextSuggestions] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  // Input history — session-scoped, like CLI history
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const draftRef = useRef('');
  const isStreaming = useChatStore((s) => s.isStreaming);
  const mode = useChatStore((s) => s.mode);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const startAssistantMessage = useChatStore((s) => s.startAssistantMessage);
  const setMode = useChatStore((s) => s.setMode);
  const setModel = useChatStore((s) => s.setModel);
  const setEffort = useChatStore((s) => s.setEffort);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const createSession = useSessionStore((s) => s.createSession);

  const contextRefs = useMemo(() => parseContextReferences(input), [input]);
  const paletteHasMatches = useMemo(() => filterCommands(slashQuery).length > 0, [slashQuery]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, []);

  const dispatchPrompt = useCallback((prompt: string) => {
    const dispatchStart = performance.now();

    if (!activeSessionId) {
      const preview = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
      createSession(preview);
    }

    addUserMessage(prompt);
    startAssistantMessage();
    setInput('');
    setShowPalette(false);
    setShowContextSuggestions(false);
    resizeTextarea();

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
  }, [activeSessionId, addUserMessage, createSession, mode, resizeTextarea, startAssistantMessage]);

  const handleCommandSelect = useCallback((command: SlashCommand, commandArgs = '') => {
    setShowPalette(false);

    if (command.category === 'mode') {
      setMode(command.name as 'chat' | 'code' | 'plan');
      setInput('');
      setShowContextSuggestions(false);
      resizeTextarea();
      textareaRef.current?.focus();
      return;
    }

    if (command.category === 'model') {
      const modelMap: Record<string, ModelId> = {
        opus: 'opus',
        sonnet: 'sonnet',
        haiku: 'haiku',
      };
      if (modelMap[command.name]) {
        setModel(modelMap[command.name]);
      }
      setInput('');
      setShowContextSuggestions(false);
      resizeTextarea();
      textareaRef.current?.focus();
      return;
    }

    if (command.category === 'effort') {
      const effortMap: Record<string, EffortLevel> = {
        'think-low': 'low',
        'think-med': 'medium',
        'think-high': 'high',
      };
      if (effortMap[command.name]) {
        setEffort(effortMap[command.name]);
      }
      setInput('');
      setShowContextSuggestions(false);
      resizeTextarea();
      textareaRef.current?.focus();
      return;
    }

    if (command.category === 'action') {
      if (command.name === 'clear') {
        clearMessages();
        setInput('');
        setShowContextSuggestions(false);
        resizeTextarea();
        historyIdxRef.current = -1;
        draftRef.current = '';
        return;
      }
      if (command.name === 'new') {
        saveCurrentSession();
        clearMessages();
        createSession();
        setInput('');
        setShowContextSuggestions(false);
        resizeTextarea();
        historyIdxRef.current = -1;
        draftRef.current = '';
        return;
      }
      const nextInput = commandArgs.trim()
        ? `/${command.name} ${commandArgs.trim()}`
        : `/${command.name} `;
      setInput(nextInput);
      setShowContextSuggestions(false);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.selectionStart = el.selectionEnd = nextInput.length;
        resizeTextarea();
      });
      return;
    }

    // Skills: insert as prompt and send
    const prompt = commandArgs.trim()
      ? `/${command.name} ${commandArgs.trim()}`
      : `/${command.name}`;
    dispatchPrompt(prompt);
  }, [clearMessages, createSession, dispatchPrompt, resizeTextarea, setEffort, setMode, setModel]);

  const executeSlashInput = useCallback((rawInput: string): boolean => {
    const match = rawInput.trim().match(/^\/([^\s]+)(?:\s+(.*))?$/);
    if (!match) return false;

    const [, commandName, commandArgs = ''] = match;
    const command = getSlashCommandByName(commandName);
    if (!command) return false;

    handleCommandSelect(command, commandArgs);
    return true;
  }, [handleCommandSelect]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    if (text.startsWith('/') && executeSlashInput(text)) {
      return;
    }

    // Save to history (prepend, dedupe top entry)
    if (historyRef.current[0] !== text) {
      historyRef.current.unshift(text);
      if (historyRef.current.length > 100) historyRef.current.pop();
    }
    historyIdxRef.current = -1;
    draftRef.current = '';

    dispatchPrompt(text);
  }, [dispatchPrompt, executeSlashInput, input, isStreaming]);

  useEffect(() => {
    const handleOpenSlashCommand = () => {
      setInput('/');
      setSlashQuery('');
      setShowPalette(true);
      setShowContextSuggestions(false);
      historyIdxRef.current = -1;
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.selectionStart = el.selectionEnd = 1;
        resizeTextarea();
      });
    };

    window.addEventListener(OPEN_SLASH_EVENT, handleOpenSlashCommand);
    return () => window.removeEventListener(OPEN_SLASH_EVENT, handleOpenSlashCommand);
  }, [resizeTextarea]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showPalette && e.key === 'Escape') {
      e.preventDefault();
      setShowPalette(false);
      return;
    }

    if (showPalette && paletteHasMatches) {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(e.key)) {
        e.preventDefault();
        return;
      }
    }

    const isComposing = composingRef.current || e.nativeEvent.isComposing;
    if (e.key === 'Enter' && !isComposing && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Escape — stop if streaming, else clear input
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isStreaming) {
        handleStop();
      } else if (input) {
        setInput('');
        setShowPalette(false);
        setShowContextSuggestions(false);
        historyIdxRef.current = -1;
        draftRef.current = '';
        resizeTextarea();
      }
      return;
    }

    // Ctrl+C — stop if streaming
    if (e.ctrlKey && e.key === 'c' && isStreaming) {
      e.preventDefault();
      handleStop();
      return;
    }

    // ↑ — navigate to older history (only when input is empty or already navigating)
    if (e.key === 'ArrowUp' && !e.shiftKey && !showPalette) {
      const atTop = (textareaRef.current?.selectionStart ?? 0) === 0;
      if (atTop && (input === '' || historyIdxRef.current >= 0)) {
        e.preventDefault();
        if (historyIdxRef.current === -1) draftRef.current = input;
        const next = Math.min(historyIdxRef.current + 1, historyRef.current.length - 1);
        if (next >= 0 && next < historyRef.current.length) {
          historyIdxRef.current = next;
          setInput(historyRef.current[next]);
          // Move cursor to end after state update
          requestAnimationFrame(() => {
            const el = textareaRef.current;
            if (el) { el.selectionStart = el.selectionEnd = el.value.length; }
          });
        }
        return;
      }
    }

    // ↓ — navigate to newer history
    if (e.key === 'ArrowDown' && !e.shiftKey && historyIdxRef.current >= 0 && !showPalette) {
      const el = textareaRef.current;
      const atBottom = (el?.selectionStart ?? 0) >= (el?.value.length ?? 0);
      if (atBottom) {
        e.preventDefault();
        const next = historyIdxRef.current - 1;
        historyIdxRef.current = next;
        setInput(next < 0 ? draftRef.current : historyRef.current[next]);
        requestAnimationFrame(() => {
          const node = textareaRef.current;
          if (!node) return;
          node.selectionStart = node.selectionEnd = node.value.length;
          resizeTextarea();
        });
        return;
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    if (historyIdxRef.current >= 0) {
      historyIdxRef.current = -1;
    }

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
    resizeTextarea();
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
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    });
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
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; }}
            placeholder={placeholders[mode]}
            rows={1}
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
