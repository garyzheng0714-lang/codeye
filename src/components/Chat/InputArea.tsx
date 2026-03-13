import { useState, useRef, useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import { sendClaudeQuery, stopClaude } from '../../hooks/useClaudeChat';
import { saveCurrentSession } from '../../utils/session';
import SlashCommandPalette from './SlashCommandPalette';
import ModelSelector from './ModelSelector';
import type { SlashCommand } from '../../data/slashCommands';
import type { ModelId } from '../../types';

export default function InputArea() {
  const [input, setInput] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, addUserMessage, startAssistantMessage, mode, setMode, setModel, clearMessages, cost, inputTokens, outputTokens } = useChatStore();
  const { activeSessionId, createSession } = useSessionStore();

  const handleSend = useCallback(() => {
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
    sendClaudeQuery({
      prompt: text,
      mode,
      model: state.model,
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
    setInput('');

    if (!activeSessionId) {
      createSession(prompt);
    }

    addUserMessage(prompt);
    startAssistantMessage();

    const state = useChatStore.getState();
    sendClaudeQuery({
      prompt,
      mode,
      model: state.model,
      cwd: state.cwd || undefined,
      sessionId: state.claudeSessionId || undefined,
    });
  }, [setMode, setModel, clearMessages, createSession, activeSessionId, addUserMessage, startAssistantMessage, mode]);

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
    } else {
      setShowPalette(false);
      setSlashQuery('');
    }

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

  return (
    <div className="input-area">
      <div className="input-container-wrapper">
        <SlashCommandPalette
          query={slashQuery}
          visible={showPalette}
          onSelect={handleCommandSelect}
          onClose={() => setShowPalette(false)}
        />
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
          <span className="input-footer-item">
            <span className={`status-dot ${isStreaming ? 'streaming' : 'idle'}`} />
            Codeye
          </span>
          <div className="input-footer-right">
            <ModelSelector />
            <span className="input-footer-item">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 8V2M3 4l2-2 2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {inputTokens.toLocaleString()}
            </span>
            <span className="input-footer-item">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 2v6M3 6l2 2 2-2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {outputTokens.toLocaleString()}
            </span>
            <span className="input-footer-item">${cost.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
