import { memo, useState, useMemo } from 'react';
import { CaretDown, CaretRight, CircleNotch, CheckCircle } from '@phosphor-icons/react';
import type { DisplayMessage, ToolCallDisplay } from '../../types';
import CodeBlock from './CodeBlock';
import ToolExpandedContent from './ToolExpandedContent';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStreamingTypewriter } from '../../hooks/useTypewriter';
import { ToolIcon } from '../../data/toolIcons';
import { getSemanticName, getToolIconBgClass } from '../../data/toolMeta';
import { parseToolOutput } from '../../utils/toolOutputParser';

type ToolType = 'read' | 'search' | 'edit' | 'command' | 'agent' | 'task' | 'other';

function getToolType(name: string): ToolType {
  if (!name) return 'other';
  if (name === 'Read') return 'read';
  if (name === 'Edit' || name === 'Write') return 'edit';
  if (name === 'Glob' || name === 'Grep' || name === 'ToolSearch' || name === 'WebSearch') return 'search';
  if (name === 'Bash') return 'command';
  if (name === 'Agent' || name === 'Task') return 'agent';
  if (name === 'TaskCreate' || name === 'TaskUpdate') return 'task';
  if (name.startsWith('mcp__')) return 'other';
  return 'other';
}

function getToolLabel(name: string, type: ToolType): string {
  const labels: Record<ToolType, string> = {
    read: 'Read',
    search: 'Searched',
    edit: name === 'Write' ? 'Created' : 'Edited',
    command: 'Ran command',
    agent: 'Agent',
    task: name === 'TaskCreate' ? 'Created task' : 'Updated task',
    other: '',
  };
  return labels[type];
}

function getToolBlockStatus(tool: ToolCallDisplay, isStreaming?: boolean): 'done' | 'running' | 'error' {
  if (tool.output?.startsWith('Error:') || tool.output?.startsWith('error:')) return 'error';
  if (isStreaming && tool.output === undefined && !tool.progressLines) return 'running';
  return 'done';
}


function ToolStatusIndicator({ status, toolName }: { status: 'done' | 'running' | 'error'; toolName?: string }) {
  if (status === 'running') {
    return (
      <span className="tool-status-circle tool-status-circle--running">
        <span className="status-pulse-dot" />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="tool-status-circle tool-status-circle--error">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 2.5v3M5 7v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  // Done: show tool-type icon in colored square for visual variety
  const bgClass = getToolIconBgClass(toolName || '');
  return (
    <div className={`tool-icon-square ${bgClass}`}>
      <ToolIcon name={toolName || ''} size={14} />
    </div>
  );
}

function ToolBlock({ tool, isStreaming }: { tool: ToolCallDisplay; isStreaming?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolType = getToolType(tool.name);
  const status = getToolBlockStatus(tool, isStreaming);
  const parsed = useMemo(() => parseToolOutput(tool), [tool]);

  const fileName = tool.input.file_path
    ? String(tool.input.file_path).split('/').pop()
    : null;

  const hasExpandableContent = !!(tool.output || tool.input.old_string || tool.input.content);

  return (
    <div className="tool-block">
      <div
        className="tool-block-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <ToolStatusIndicator status={status} toolName={tool.name} />

        <span className="tool-block-label">
          {toolType === 'other' ? getSemanticName(tool.name) : getToolLabel(tool.name, toolType)}
        </span>

        {fileName && <span className="tool-file-badge">{fileName}</span>}

        {/* Command string for Bash */}
        {tool.name === 'Bash' && typeof tool.input.command === 'string' && (
          <span className="tool-file-badge">
            {String(tool.input.command).length > 80
              ? `${String(tool.input.command).slice(0, 80)}...`
              : String(tool.input.command)}
          </span>
        )}

        {/* Search pattern + count for Grep/Glob */}
        {parsed.kind === 'search' && (
          <>
            {parsed.pattern && <span className="tool-pattern-badge">{parsed.pattern}</span>}
            {parsed.matchCount > 0 && <span className="tool-match-count">{parsed.matchCount} results</span>}
          </>
        )}

        {/* Line count for Read */}
        {parsed.kind === 'read' && parsed.lineCount > 0 && (
          <span className="tool-line-count">{parsed.lineCount} lines</span>
        )}

        {/* Diff counts for Edit/Write */}
        {parsed.kind === 'edit' && (parsed.added > 0 || parsed.removed > 0) && (
          <span className="tool-diff-count">
            <span className="tool-diff-add">+{parsed.added}</span>
            <span className="tool-diff-del">-{parsed.removed}</span>
          </span>
        )}

        {hasExpandableContent && (
          <span className="tool-block-expand">
            {isExpanded ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
          </span>
        )}
      </div>

      {isExpanded && hasExpandableContent && (
        <div className="tool-block-content">
          <ToolExpandedContent tool={tool} />
        </div>
      )}
    </div>
  );
}

function ReadGroup({ tools, isStreaming }: { tools: ToolCallDisplay[]; isStreaming?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const anyError = tools.some(t => t.output?.startsWith('Error:'));
  const anyRunning = isStreaming && tools.some(t => t.output === undefined);
  const status: 'done' | 'running' | 'error' = anyRunning ? 'running' : anyError ? 'error' : 'done';

  return (
    <div className="tool-block">
      <div
        className="tool-block-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <ToolStatusIndicator status={status} toolName="Read" />
        <span className="tool-block-label">
          {tools.length > 1 ? `Read ${tools.length} files` : 'Read file'}
        </span>
        <div className="tool-block-files">
          {tools.slice(0, 4).map((t, i) => {
            const name = t.input.file_path
              ? String(t.input.file_path).split('/').pop()
              : 'file';
            return <span key={i} className="tool-file-badge">{name}</span>;
          })}
          {tools.length > 4 && (
            <span className="tool-block-more">+{tools.length - 4}</span>
          )}
        </div>
        <span className="tool-block-expand">
          {isExpanded ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
        </span>
      </div>

      {isExpanded && (
        <div className="tool-block-content">
          <div className="tool-read-group-list">
            {tools.map((t, i) => {
              const filePath = t.input.file_path ? String(t.input.file_path) : 'unknown';
              const lineCount = t.output ? t.output.split('\n').length : 0;
              return (
                <div key={i} className="tool-read-group-item">
                  <span className="tool-expanded-path">{filePath}</span>
                  {lineCount > 0 && <span className="tool-line-count">{lineCount} lines</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskBlock({ tool, isStreaming }: { tool: ToolCallDisplay; isStreaming?: boolean }) {
  const isRunning = isStreaming === true && tool.output === undefined;

  const tasks = tool.progressLines?.map((line) => {
    const isDone = line.startsWith('[x]') || line.startsWith('[done]');
    return { label: line.replace(/^\[(x|done|pending|\s)\]\s*/, ''), done: isDone };
  });

  const title = String(tool.input.description || (tool.input.prompt as string)?.slice(0, 60) || 'Agent Task');

  if (!tasks || tasks.length === 0) {
    return (
      <div className="task-module">
        <div className="task-module-header">
          <span className="task-module-title">Task: {title}</span>
          <span className="task-module-status">
            <span className="task-module-status-dot" />
            IN PROGRESS
          </span>
        </div>
        <div className="task-module-meta">0/0 steps</div>
      </div>
    );
  }

  const doneCount = tasks.filter(t => t.done).length;
  const allDone = doneCount === tasks.length && !isRunning;

  return (
    <div className="task-module">
      <div className="task-module-header">
        <span className="task-module-title">Task: {title}</span>
        <span className={`task-module-status ${allDone ? 'task-module-status--done' : ''}`}>
          <span className="task-module-status-dot" />
          {allDone ? 'COMPLETED' : 'IN PROGRESS'}
        </span>
      </div>
      <div className="task-module-list">
        {tasks.map((task, i) => {
          const isActive = isRunning && !task.done && i === doneCount;
          return (
            <div key={i} className={`task-item ${task.done ? 'task-item--done' : ''} ${isActive ? 'task-item--active' : ''}`}>
              {task.done ? (
                <CheckCircle size={18} weight="fill" className="task-item-check" />
              ) : isActive ? (
                <CircleNotch size={18} weight="bold" className="task-item-spinner tool-spinner" />
              ) : (
                <span className="task-item-circle" />
              )}
              <span className="task-item-label">{task.label}</span>
            </div>
          );
        })}
      </div>
      <div className="task-module-meta">
        {doneCount}/{tasks.length} steps
      </div>
    </div>
  );
}

export default memo(function AIMessage({ message, showAvatar = true }: { message: DisplayMessage; showAvatar?: boolean }) {
  const isThinking = message.isStreaming && !message.content && message.toolCalls.length === 0;
  const displayContent = useStreamingTypewriter(message.content || '', message.isStreaming ?? false);

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
      <div className="message-content-wrapper">
        {showAvatar && (
          <div className={`ai-message-header ${message.isStreaming ? 'streaming' : ''}`}>
            <div className="ai-avatar-inline">
              <div className="avatar-eye" />
              <div className="avatar-eye" />
            </div>
            <span className="message-role-label">Codeye</span>
          </div>
        )}
        <div className="ai-message-flat">
          {groupedTools.map((item, idx) => {
            if ('kind' in item && item.kind === 'group') {
              return <ReadGroup key={`group-${idx}`} tools={item.tools} isStreaming={message.isStreaming} />;
            }
            const tool = item as ToolCallDisplay;
            if (tool.name === 'Agent' || tool.name === 'Task') {
              return <TaskBlock key={tool.id} tool={tool} isStreaming={message.isStreaming} />;
            }
            return <ToolBlock key={tool.id} tool={tool} isStreaming={message.isStreaming} />;
          })}

          {isThinking && (
            <div className="thinking-block">
              <div className="thinking-dots">
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
              <span className="thinking-text">Thinking...</span>
            </div>
          )}

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
