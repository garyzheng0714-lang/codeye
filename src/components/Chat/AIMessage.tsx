import { useCallback, memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, GitFork, Zap } from 'lucide-react';
import type { DisplayMessage, ToolCallDisplay } from '../../types';
import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import { getToolStatus, getToolColor } from '../../data/toolMeta';
import { ToolIcon, SpinnerIcon } from '../../data/toolIcons';
import ToolCall from './ToolCall';
import CodeBlock from './CodeBlock';
import GitResultCard from './GitResultCard';

// ── Consecutive Read grouping ──────────────────────────────────────────

type GroupedTool =
  | { kind: 'single'; tool: ToolCallDisplay }
  | { kind: 'reads'; files: string[]; running: boolean; error: boolean };

function groupToolCalls(tools: ToolCallDisplay[], isStreaming: boolean): GroupedTool[] {
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
        const s = getToolStatus(tools[i], { isStreaming });
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

function getStepsStatus(grouped: GroupedTool[], isStreaming: boolean): 'running' | 'error' | 'completed' {
  for (const g of grouped) {
    if (g.kind === 'reads') {
      if (g.running) return 'running';
      if (g.error) return 'error';
    } else {
      const s = getToolStatus(g.tool, { isStreaming });
      if (s === 'running' || s === 'pending') return 'running';
      if (s === 'error') return 'error';
    }
  }
  return 'completed';
}

// ── Grouped Read row (inside steps block) ────────────────────────────

function StepStatusCircle({ status }: { status: 'done' | 'running' | 'error' }) {
  if (status === 'running') {
    return (
      <span className="step-circle step-circle--running">
        <span className="step-circle-inner" />
      </span>
    );
  }
  if (status === 'error') {
    return <span className="step-circle step-circle--error">!</span>;
  }
  return (
    <span className="step-circle step-circle--done">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function ReadGroupRow({ files, running, error, index = 0 }: { files: string[]; running: boolean; error: boolean; index?: number }) {
  return (
    <div className="step-row" style={{ '--tool-index': index } as React.CSSProperties}>
      <div className="step-row-left">
        <StepStatusCircle status={error ? 'error' : running ? 'running' : 'done'} />
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
  const messageIsStreaming = Boolean(message.isStreaming);

  const grouped = groupToolCalls(message.toolCalls, messageIsStreaming);

  // Split into step tools vs bash tools
  const stepTools = grouped.filter((g) =>
    g.kind === 'reads' || (g.kind === 'single' && g.tool.name !== 'Bash')
  );
  const bashTools = grouped.filter((g) =>
    g.kind === 'single' && g.tool.name === 'Bash'
  ) as { kind: 'single'; tool: ToolCallDisplay }[];

  const stepsStatus = stepTools.length > 0 ? getStepsStatus(stepTools, messageIsStreaming) : null;

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

  if (message.gitResult) {
    return (
      <div className="message-row ai-message-row" data-message-id={message.id}>
        <div className="ai-message">
          <GitResultCard result={message.gitResult} />
        </div>
      </div>
    );
  }

  return (
    <div className="message-row ai-message-row" data-message-id={message.id}>
      <div className="ai-message">
        {/* Thinking state */}
        {isThinking && (
          <div className="thinking-row">
            <div className="thinking-dots" aria-hidden="true">
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
                <Zap size={12} strokeWidth={2} />
                Steps
              </span>
              <span className={`steps-status steps-status--${stepsStatus}`} aria-live="polite">
                {stepsStatus === 'running' ? 'In Progress' : stepsStatus === 'error' ? 'Error' : `Completed (${stepTools.length})`}
              </span>
            </div>
            <div className="steps-list">
              {stepTools.map((g, i) =>
                g.kind === 'reads' ? (
                  <ReadGroupRow key={`reads-${i}`} files={g.files} running={g.running} error={g.error} index={i} />
                ) : (
                  <ToolCall
                    key={g.tool.id}
                    tool={g.tool}
                    messageId={message.id}
                    index={i}
                    isStreaming={messageIsStreaming}
                  />
                )
              )}
            </div>
          </div>
        )}

        {/* Terminal output blocks (Bash) */}
        {bashTools.map((g, i) => (
          <ToolCall
            key={g.tool.id}
            tool={g.tool}
            messageId={message.id}
            index={i}
            isStreaming={messageIsStreaming}
          />
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
              <button className="ai-action-btn" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'} aria-label={copied ? 'Copied' : 'Copy message'}>
                {copied ? (
                  <Check size={13} strokeWidth={2} style={{ color: 'var(--success)' }} />
                ) : (
                  <Copy size={13} strokeWidth={1.8} />
                )}
              </button>
              <button className="ai-action-btn" onClick={handleFork} title="Fork from here" aria-label="Fork conversation from here">
                <GitFork size={13} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
