import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { DisplayMessage, ToolCallDisplay } from '../../types';
import CodeyeMark from '../Brand/CodeyeMark';
import CodeBlock from './CodeBlock';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStreamingTypewriter } from '../../hooks/useTypewriter';

// Tool type mapping
type ToolType = 'read' | 'search' | 'edit' | 'command';

function getToolType(name: string): ToolType {
  if (name === 'Read' || name === 'Edit') return 'read';
  if (name === 'Glob' || name === 'Grep') return 'search';
  if (name === 'Bash') return 'command';
  return 'read';
}

function getToolLabel(type: ToolType): string {
  const labels: Record<ToolType, string> = {
    read: 'Read',
    search: 'Searched',
    edit: 'Accepted edits to',
    command: 'Ran command',
  };
  return labels[type];
}

// Kiro-style status circle component
function StepStatusCircle({ status }: { status: 'done' | 'running' | 'error' }) {
  if (status === 'running') {
    return (
      <span className="kiro-status kiro-status--running">
        <span className="kiro-status-dot" />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="kiro-status kiro-status--error">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 3v2M5 6.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="kiro-status kiro-status--done">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// Simple ToolBlock component
function ToolBlock({ tool, messageId }: { tool: ToolCallDisplay; messageId: string }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const toolType = getToolType(tool.name);

  // Determine status for Kiro-style circle
  let status: 'done' | 'running' | 'error' = 'done';
  if (tool.output === undefined && !tool.progressLines) {
    status = 'running';
  } else if (tool.output?.startsWith('Error:')) {
    status = 'error';
  }

  const fileName = tool.input.file_path
    ? String(tool.input.file_path).split('/').pop()
    : null;

  return (
    <div className="tool-block">
      {/* Tool header */}
      <div
        className="tool-block-header"
        onClick={() => tool.output && setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            tool.output && setIsExpanded(!isExpanded);
          }
        }}
      >
        {/* Kiro-style status circle */}
        <StepStatusCircle status={status} />

        <span className="tool-block-label">{getToolLabel(toolType)}</span>

        {fileName && (
          <span className="tool-file-badge">{fileName}</span>
        )}

        {/* Expand/collapse */}
        {tool.output && (
          <span className="tool-block-expand">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </div>

      {/* Tool content */}
      {isExpanded && tool.output && (
        <div className="tool-block-content">
          <pre className="tool-block-output">{tool.output}</pre>
        </div>
      )}
    </div>
  );
}

export default memo(function AIMessage({ message }: { message: DisplayMessage }) {
  const isThinking = message.isStreaming && !message.content && message.toolCalls.length === 0;

  // Use typewriter effect for streaming content
  const displayContent = useStreamingTypewriter(message.content || '', message.isStreaming ?? false);

  // Group consecutive Read tools
  const groupedTools: (ToolCallDisplay | { kind: 'group'; tools: ToolCallDisplay[] })[] = [];
  let currentGroup: ToolCallDisplay[] = [];

  for (const tool of message.toolCalls) {
    if (tool.name === 'Read') {
      currentGroup.push(tool);
    } else {
      if (currentGroup.length > 0) {
        groupedTools.push({ kind: 'group', tools: currentGroup });
        currentGroup = [];
      }
      groupedTools.push(tool);
    }
  }
  if (currentGroup.length > 0) {
    groupedTools.push({ kind: 'group', tools: currentGroup });
  }

  return (
    <div className="message-row ai-message-row" data-message-id={message.id}>
      {/* AI Avatar */}
      <div className={`message-avatar message-avatar--ai ${message.isStreaming ? 'streaming' : ''}`}>
        <CodeyeMark size={20} animate={message.isStreaming ? 'thinking' : 'idle'} />
      </div>

      {/* Message content */}
      <div className="message-content-wrapper">
        <div className="message-header">
          <span className="message-sender">Codeye</span>
        </div>

        <div className="ai-message-flat">
          {/* Tool blocks */}
          {groupedTools.map((item, idx) => {
            if ('kind' in item && item.kind === 'group') {
              // Read group
              return (
                <div key={`group-${idx}`} className="tool-block">
                  <div className="tool-block-header">
                    <StepStatusCircle status="done" />
                    <span className="tool-block-label">Read {item.tools.length > 1 ? 'files' : 'file'}</span>
                    <div className="tool-block-files">
                      {item.tools.slice(0, 4).map((t, i) => {
                        const name = t.input.file_path
                          ? String(t.input.file_path).split('/').pop()
                          : 'file';
                        return (
                          <span key={i} className="tool-file-badge">{name}</span>
                        );
                      })}
                      {item.tools.length > 4 && (
                        <span className="tool-block-more">+{item.tools.length - 4}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            return <ToolBlock key={(item as ToolCallDisplay).id} tool={item as ToolCallDisplay} messageId={message.id} />;
          })}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="thinking-row">
              <Loader2 size={16} className="animate-spin" />
              <span className="thinking-text">Thinking</span>
            </div>
          )}

          {/* Message text with typewriter effect */}
          {displayContent && (
            <div className="ai-message-text">
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
                {displayContent}
              </ReactMarkdown>
              {message.isStreaming && <span className="streaming-cursor" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
