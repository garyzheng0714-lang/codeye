import { useState, useReducer, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseClaudeMessage } from '../../types/protocol';
import { parseStreamEvent } from '../../types/streamEvent';
import { useChatStore } from '../../stores/chatStore';
import { getEffectiveEffort, normalizeModelId, toCliModelId } from '../../data/models';

const WS_URL = 'ws://localhost:5174';
const PANE_ID = 'secondary';

interface PaneToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface PaneMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: PaneToolCall[];
  isStreaming: boolean;
}

type PaneAction =
  | { type: 'add_user'; content: string }
  | { type: 'start_assistant' }
  | { type: 'append_content'; text: string }
  | { type: 'add_tool'; tool: PaneToolCall }
  | { type: 'finish' }
  | { type: 'clear' };

function paneReducer(state: PaneMessage[], action: PaneAction): PaneMessage[] {
  switch (action.type) {
    case 'add_user':
      return [...state, { id: crypto.randomUUID(), role: 'user', content: action.content, toolCalls: [], isStreaming: false }];
    case 'start_assistant':
      return [...state, { id: crypto.randomUUID(), role: 'assistant', content: '', toolCalls: [], isStreaming: true }];
    case 'append_content': {
      if (state.length === 0) return state;
      const last = state[state.length - 1];
      if (last.role !== 'assistant') return state;
      return [...state.slice(0, -1), { ...last, content: last.content + action.text }];
    }
    case 'add_tool': {
      if (state.length === 0) return state;
      const last = state[state.length - 1];
      if (last.role !== 'assistant') return state;
      return [...state.slice(0, -1), { ...last, toolCalls: [...last.toolCalls, action.tool] }];
    }
    case 'finish': {
      if (state.length === 0) return state;
      const last = state[state.length - 1];
      return [...state.slice(0, -1), { ...last, isStreaming: false }];
    }
    case 'clear':
      return [];
    default:
      return state;
  }
}

function getSemanticName(name: string): string {
  const map: Record<string, string> = {
    Read: 'Read', Write: 'Write', Edit: 'Edit', Bash: 'Run',
    Glob: 'Find', Grep: 'Search', LS: 'List',
  };
  return map[name] ?? name;
}

export default function SplitPane({ onClose }: { onClose: () => void }) {
  const [messages, dispatch] = useReducer(paneReducer, []);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const draftRef = useRef('');
  const batchRef = useRef<string[]>([]);
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBatch = useCallback(() => {
    if (batchRef.current.length === 0) return;
    const text = batchRef.current.join('');
    batchRef.current = [];
    if (batchTimerRef.current) { clearTimeout(batchTimerRef.current); batchTimerRef.current = null; }
    dispatch({ type: 'append_content', text });
  }, []);

  const pushText = useCallback((text: string) => {
    batchRef.current.push(text);
    if (!batchTimerRef.current) {
      batchTimerRef.current = setTimeout(flushBatch, 16);
    }
  }, [flushBatch]);

  const handleMsg = useCallback((rawMessage: unknown) => {
    const parsed = parseClaudeMessage(rawMessage);
    if (!parsed) return;
    if (parsed.type === 'assistant' && parsed.message?.content) {
      for (const block of parsed.message.content) {
        if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
          pushText(block.text);
        }
      }
      for (const block of parsed.message.content) {
        if (block.type === 'tool_use' && typeof block.name === 'string') {
          flushBatch();
          dispatch({
            type: 'add_tool',
            tool: {
              id: typeof block.tool_use_id === 'string' ? block.tool_use_id : crypto.randomUUID(),
              name: block.name,
              input: block.input && typeof block.input === 'object' && !Array.isArray(block.input)
                ? (block.input as Record<string, unknown>)
                : {},
            },
          });
        }
      }
    }
  }, [pushText, flushBatch]);

  const handleComplete = useCallback(() => {
    flushBatch();
    dispatch({ type: 'finish' });
    setIsStreaming(false);
  }, [flushBatch]);

  const handleError = useCallback((err: string) => {
    flushBatch();
    dispatch({ type: 'append_content', text: `\n\n**Error:** ${err}` });
    dispatch({ type: 'finish' });
    setIsStreaming(false);
  }, [flushBatch]);

  // Setup Claude connection
  useEffect(() => {
    if (window.electronAPI) {
      const rm = window.electronAPI.claude.onPaneMessage(PANE_ID, handleMsg);
      const rc = window.electronAPI.claude.onPaneComplete(PANE_ID, handleComplete);
      const re = window.electronAPI.claude.onPaneError(PANE_ID, handleError);
      return () => { rm(); rc(); re(); };
    }

    // WS mode: independent connection
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data as string);
        const streamEvent = parseStreamEvent(raw);
        if (streamEvent) {
          if (streamEvent.type === 'message') handleMsg((streamEvent.payload as { data: unknown }).data);
          else if (streamEvent.type === 'complete') handleComplete();
          else if (streamEvent.type === 'error') handleError((streamEvent.payload as { error: string }).error);
          return;
        }
        // Legacy format fallback
        if (raw.type === 'message') handleMsg(raw.data);
        else if (raw.type === 'complete') handleComplete();
        else if (raw.type === 'error') handleError(raw.error as string);
      } catch {
        // ignore malformed
      }
    };
    return () => { ws.close(); wsRef.current = null; };
  }, [handleMsg, handleComplete, handleError]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    if (historyRef.current[0] !== text) {
      historyRef.current.unshift(text);
      if (historyRef.current.length > 100) historyRef.current.pop();
    }
    historyIdxRef.current = -1;
    draftRef.current = '';

    dispatch({ type: 'add_user', content: text });
    dispatch({ type: 'start_assistant' });
    setInput('');
    setIsStreaming(true);

    const chatState = useChatStore.getState();
    const normalizedModel = normalizeModelId(chatState.model);
    const params = {
      prompt: text,
      model: toCliModelId(normalizedModel),
      effort: getEffectiveEffort(normalizedModel, chatState.effort),
      cwd: chatState.cwd || undefined,
    };

    if (window.electronAPI) {
      window.electronAPI.claude.queryPane(PANE_ID, params);
    } else {
      wsRef.current?.send(JSON.stringify({ type: 'query', ...params }));
    }
  }, [input, isStreaming]);

  const stop = useCallback(() => {
    setIsStreaming(false);
    if (window.electronAPI) {
      window.electronAPI.claude.stopPane(PANE_ID);
    } else {
      wsRef.current?.send(JSON.stringify({ type: 'stop' }));
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return; }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isStreaming) stop(); else setInput('');
      return;
    }
    if (e.ctrlKey && e.key === 'c' && isStreaming) { e.preventDefault(); stop(); return; }

    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const atTop = (textareaRef.current?.selectionStart ?? 0) === 0;
      if (atTop && (input === '' || historyIdxRef.current >= 0)) {
        e.preventDefault();
        if (historyIdxRef.current === -1) draftRef.current = input;
        const next = Math.min(historyIdxRef.current + 1, historyRef.current.length - 1);
        if (next >= 0) {
          historyIdxRef.current = next;
          setInput(historyRef.current[next]);
          requestAnimationFrame(() => {
            const el = textareaRef.current;
            if (el) { el.selectionStart = el.selectionEnd = el.value.length; }
          });
        }
        return;
      }
    }
    if (e.key === 'ArrowDown' && !e.shiftKey && historyIdxRef.current >= 0) {
      const el = textareaRef.current;
      if ((el?.selectionStart ?? 0) >= (el?.value.length ?? 0)) {
        e.preventDefault();
        const next = historyIdxRef.current - 1;
        historyIdxRef.current = next;
        setInput(next < 0 ? draftRef.current : historyRef.current[next]);
        return;
      }
    }
  };

  return (
    <div className="split-pane">
      <div className="split-pane-header">
        <div className="split-pane-title">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="4.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="6.5" y="1" width="4.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span>Split</span>
        </div>
        <div className="split-pane-header-actions">
          <button className="split-pane-action" onClick={() => dispatch({ type: 'clear' })} title="Clear (⌘K)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 3h8M4 3V2h4v1M5 5.5v3M7 5.5v3M3 3l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="split-pane-action split-pane-close" onClick={onClose} title="Close split (⌘W)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="split-pane-messages">
        {messages.length === 0 && (
          <div className="split-pane-empty">
            <p>New conversation</p>
            <p className="split-pane-hint">↑↓ history · Esc stop · ⌘W close</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`split-msg split-msg--${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="split-user-bubble">{msg.content}</div>
            ) : (
              <div className="split-ai-content">
                {msg.toolCalls.length > 0 && (
                  <div className="split-tool-list">
                    {msg.toolCalls.map((tc) => (
                      <div key={tc.id} className="split-tool-item">
                        <span className="split-tool-dot" />
                        <span className="split-tool-name">{getSemanticName(tc.name)}</span>
                        {typeof tc.input.file_path === 'string' && (
                          <span className="split-tool-path">
                            {tc.input.file_path.split('/').slice(-2).join('/')}
                          </span>
                        )}
                        {typeof tc.input.command === 'string' && (
                          <code className="split-tool-cmd">{tc.input.command.slice(0, 40)}</code>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {msg.content && (
                  <div className="split-ai-text">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children }) {
                          const match = /language-(\w+)/.exec(className || '');
                          if (match) {
                            return (
                              <pre className="split-code-block">
                                <code>{children}</code>
                              </pre>
                            );
                          }
                          return <code className="inline-code">{children}</code>;
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
                {msg.isStreaming && !msg.content && msg.toolCalls.length === 0 && (
                  <span className="thinking-indicator-text" style={{ fontSize: '12px', fontStyle: 'italic' }}>Thinking...</span>
                )}
                {msg.isStreaming && <span className="streaming-cursor" />}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="split-pane-input-area">
        <div className={`split-input-container ${isStreaming ? 'streaming' : ''}`}>
          <textarea
            ref={textareaRef}
            className="split-input-textarea"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            disabled={isStreaming}
            autoFocus
          />
          {isStreaming ? (
            <button className="stop-btn" onClick={stop} title="Stop (Esc)">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
              </svg>
            </button>
          ) : (
            <button className="send-btn" onClick={send} disabled={!input.trim()} title="Send (Enter)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 11.5L11.5 7L2.5 2.5v3.5l5 1-5 1v3.5z" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
