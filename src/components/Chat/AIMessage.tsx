import { useCallback, memo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { DisplayMessage, ToolCallDisplay } from '../../types';
import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import CodeyeMark from '../Brand/CodeyeMark';
import CodeBlock from './CodeBlock';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

function getToolIcon(type: ToolType) {
  const icons = {
    read: FileText,
    search: Search,
    edit: FileText,
    command: FileText,
  };
  return icons[type];
}

// Simple ToolBlock component
function ToolBlock({ tool, messageId }: { tool: ToolCallDisplay; messageId: string }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const toggleToolExpand = useChatStore((s) => s.toggleToolExpand);

  const toolType = getToolType(tool.name);
  const ToolIcon = getToolIcon(toolType);

  // Determine status
  let status: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  if (tool.output === undefined && !tool.progressLines) {
    status = 'loading';
  } else if (tool.output?.startsWith('Error:')) {
    status = 'error';
  } else {
    status = 'success';
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
        <ToolIcon size={16} className="tool-block-icon" />
        <span className="tool-block-label">{getToolLabel(toolType)}</span>

        {fileName && (
          <span className="tool-block-file">{fileName}</span>
        )}

        {/* Status icon */}
        <span className="tool-block-status">
          {status === 'loading' && <Loader2 size={16} className="animate-spin" />}
          {status === 'success' && <CheckCircle2 size={16} className="text-success" />}
          {status === 'error' && <XCircle size={16} className="text-danger" />}
        </span>

        {/* Expand/collapse */}
        {tool.output && (
          <span className="tool-block-expand">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
      <div className="message-avatar message-avatar--ai">
        <CodeyeMark size={20} />
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
                    <FileText size={16} className="tool-block-icon" />
                    <span className="tool-block-label">Read {item.tools.length > 1 ? 'files' : 'file'}</span>
                    <div className="tool-block-files">
                      {item.tools.slice(0, 4).map((t, i) => {
                        const name = t.input.file_path
                          ? String(t.input.file_path).split('/').pop()
                          : 'file';
                        return (
                          <span key={i} className="tool-block-file">{name}</span>
                        );
                      })}
                      {item.tools.length > 4 && (
                        <span className="tool-block-more">+{item.tools.length - 4}</span>
                      )}
                    </div>
                    <CheckCircle2 size={16} className="text-success tool-block-status" />
                  </div>
                </div>
              );
            }
            return <ToolBlock key={item.id} tool={item} messageId={message.id} />;
          })}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="thinking-row">
              <Loader2 size={16} className="animate-spin" />
              <span className="thinking-text">Thinking</span>
            </div>
          )}

          {/* Message text */}
          {message.content && (
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
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
