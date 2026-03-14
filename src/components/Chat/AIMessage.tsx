import { useCallback, memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DisplayMessage, ToolCallDisplay } from '../../types';
import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import { getToolStatus, getToolColor } from '../../data/toolMeta';
import { ToolIcon, SpinnerIcon } from '../../data/toolIcons';
import ToolCall from './ToolCall';
import CodeBlock from './CodeBlock';

// ── Consecutive Read grouping ──────────────────────────────────────────

type GroupedTool =
  | { kind: 'single'; tool: ToolCallDisplay }
  | { kind: 'reads'; files: string[]; running: boolean; error: boolean };

function groupToolCalls(tools: ToolCallDisplay[]): GroupedTool[] {
  const out: GroupedTool[] = [];
  let i = 0;
  while (i < tools.length) {
    const t = tools[i];
    if (t.name === 'Read') {
      const files: string[] = [];
      let running = false;
      let error = false;
      while (i < tools.length && tools[i].name === 'Read') {
        const fp = tools[i].input.file_path ? String(tools[i].input.file_path) : '';
        const fname = fp.split('/').pop() || fp;
        if (fname) files.push(fname);
        const s = getToolStatus(tools[i]);
        if (s === 'running' || s === 'pending') running = true;
        if (s === 'error') error = true;
        i++;
      }
      out.push({ kind: 'reads', files, running, error });
    } else {
      out.push({ kind: 'single', tool: t });
      i++;
    }
  }
  return out;
}

// ── Steps block status ───────────────────────────────────────────────

function getStepsStatus(grouped: GroupedTool[]): 'running' | 'error' | 'completed' {
  for (const g of grouped) {
    if (g.kind === 'reads') {
      if (g.running) return 'running';
      if (g.error) return 'error';
    } else {
      const s = getToolStatus(g.tool);
      if (s === 'running' || s === 'pending') return 'running';
      if (s === 'error') return 'error';
    }
  }
  return 'completed';
}

// ── Grouped Read row (inside steps block) ────────────────────────────

function ReadGroupRow({ files, running, error, index = 0 }: { files: string[]; running: boolean; error: boolean; index?: number }) {
  const color = error ? 'var(--danger)' : running ? 'var(--text-muted)' : getToolColor('Read');
  return (
    <div className="step-row" style={{ '--tool-index': index } as React.CSSProperties}>
      <div className="step-row-left">
        <span className="tool-icon" style={{ color }}>
          {running ? <SpinnerIcon size={14} /> : <ToolIcon name="Read" size={14} />}
        </span>
        <span className="step-label">Read {files.length > 1 ? 'files' : 'file'}</span>
        <div className="step-badges">
          {files.slice(0, 4).map((f, i) => (
            <code key={i} className="step-file-pill">{f}</code>
          ))}
          {files.length > 4 && (
            <span className="step-count">+{files.length - 4}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default memo(function AIMessage({ message }: { message: DisplayMessage }) {
  const [copied, setCopied] = useState(false);
  const isThinking = message.isStreaming && !message.content && message.toolCalls.length === 0;

  const grouped = groupToolCalls(message.toolCalls);

  // Split into step tools vs bash tools
  const stepTools = grouped.filter((g) =>
    g.kind === 'reads' || (g.kind === 'single' && g.tool.name !== 'Bash')
  );
  const bashTools = grouped.filter((g) =>
    g.kind === 'single' && g.tool.name === 'Bash'
  ) as { kind: 'single'; tool: ToolCallDisplay }[];

  const stepsStatus = stepTools.length > 0 ? getStepsStatus(stepTools) : null;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
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
      <div className="ai-message">
        {/* Thinking state */}
        {isThinking && (
          <div className="thinking-row">
            <div className="thinking-dots">
              <div className="thinking-dot" />
              <div className="thinking-dot" />
              <div className="thinking-dot" />
            </div>
            <span className="thinking-text">Thinking</span>
          </div>
        )}

        {/* Steps taken block */}
        {stepTools.length > 0 && (
          <div className="ai-steps-block">
            <div className="steps-header">
              <span className="steps-header-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4.5C7.5 4.5 3.5 8.5 2 12c1.5 3.5 5.5 7.5 10 7.5s8.5-4 10-7.5c-1.5-3.5-5.5-7.5-10-7.5z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                STEPS TAKEN
              </span>
              <span className={`steps-status steps-status--${stepsStatus}`}>
                {stepsStatus === 'running' ? 'Running' : stepsStatus === 'error' ? 'Error' : 'Completed'}
              </span>
            </div>
            <div className="steps-list">
              {stepTools.map((g, i) =>
                g.kind === 'reads' ? (
                  <ReadGroupRow key={`reads-${i}`} files={g.files} running={g.running} error={g.error} index={i} />
                ) : (
                  <ToolCall key={g.tool.id} tool={g.tool} messageId={message.id} index={i} />
                )
              )}
            </div>
          </div>
        )}

        {/* Terminal output blocks (Bash) */}
        {bashTools.map((g, i) => (
          <ToolCall key={g.tool.id} tool={g.tool} messageId={message.id} index={i} />
        ))}

        {/* AI text */}
        {message.content && (
          <div className="ai-text-body">
            <div className="ai-message-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    if (match) {
                      return <CodeBlock code={codeString} language={match[1]} />;
                    }
                    return <code className="inline-code">{children}</code>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
{message.isStreaming && <span className="streaming-cursor" />}
            <div className="ai-message-actions">
              <button className="ai-action-btn" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
                {copied ? (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2.5 6.5l3 3 5-5" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M2 9.5V2.5a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <button className="ai-action-btn" onClick={handleFork} title="Fork from here">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="3.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="9.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6.5 4v2.5c0 1-1 1.8-3 2.5m3-5v2.5c0 1 1 1.8 3 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
