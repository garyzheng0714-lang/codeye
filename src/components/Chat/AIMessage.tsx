import { useState, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DisplayMessage } from '../../types';
import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import ToolCall from './ToolCall';
import CodeBlock from './CodeBlock';

const COLLAPSE_THRESHOLD = 500;

export default memo(function AIMessage({ message }: { message: DisplayMessage }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const shouldCollapse = message.content.length > COLLAPSE_THRESHOLD && !message.isStreaming;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable
    }
  }, [message.content]);

  const handleFork = useCallback(() => {
    const messages = useChatStore.getState().messages;
    const idx = messages.findIndex((m) => m.id === message.id);
    if (idx < 0) return;

    const activeSessionId = useSessionStore.getState().activeSessionId;
    if (!activeSessionId) return;

    useSessionStore.getState().forkSession(activeSessionId, idx);
  }, [message.id]);

  return (
    <div className="message-row ai-message-row" data-message-id={message.id}>
      <div className="ai-message-wrapper">
        <div className="ai-avatar">
          <svg viewBox="0 0 120 120" fill="none">
            <path d="M52 8C30 10, 10 30, 12 58C14 86, 34 110, 62 110C90 110, 112 86, 110 56C108 28, 88 6, 66 6C60 6, 56 7, 52 8Z" fill="var(--accent)"/>
            <ellipse cx="48" cy="62" rx="9" ry="12" fill="white"/>
            <ellipse cx="72" cy="62" rx="9" ry="12" fill="white"/>
            <ellipse cx="50" cy="65" rx="5" ry="7" fill="var(--text-primary)"/>
            <ellipse cx="74" cy="65" rx="5" ry="7" fill="var(--text-primary)"/>
          </svg>
        </div>
        <div className="ai-message">
          {message.toolCalls.map((tool) => (
            <ToolCall key={tool.id} tool={tool} messageId={message.id} />
          ))}
          <div
            className={`ai-message-content ${shouldCollapse && !expanded ? 'collapsed' : ''}`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  if (match) {
                    return <CodeBlock code={codeString} language={match[1]} />;
                  }
                  return (
                    <code className="inline-code" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          {shouldCollapse && !expanded && (
            <button className="expand-btn" onClick={() => setExpanded(true)}>
              Show full response
            </button>
          )}
          {message.isStreaming && <span className="streaming-cursor" />}
        </div>
        <div className="ai-message-actions">
          <button className="ai-action-btn" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7l3 3 5-5" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M2 10V3a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <button className="ai-action-btn" onClick={handleFork} title="Fork from here">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="4" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="10" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M7 4.5v2.5c0 1-1 2-3 2.5m3-4.5v2.5c0 1 1 2 3 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
