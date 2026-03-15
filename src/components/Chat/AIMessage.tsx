import { memo, useState } from 'react';
import { CaretDown, CaretRight, CircleNotch, CheckCircle } from '@phosphor-icons/react';
import type { DisplayMessage, ToolCallDisplay } from '../../types';
import CodeyeMark from '../Brand/CodeyeMark';
import CodeBlock from './CodeBlock';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStreamingTypewriter } from '../../hooks/useTypewriter';
import { ToolIcon, SpinnerIcon } from '../../data/toolIcons';
import { getToolColor } from '../../data/toolMeta';

type ToolType = 'read' | 'search' | 'edit' | 'command' | 'agent';

function getToolType(name: string): ToolType {
  if (name === 'Read') return 'read';
  if (name === 'Edit' || name === 'Write') return 'edit';
  if (name === 'Glob' || name === 'Grep' || name === 'WebSearch') return 'search';
  if (name === 'Bash') return 'command';
  if (name === 'Agent' || name === 'Task') return 'agent';
  return 'read';
}

function getToolLabel(name: string, type: ToolType): string {
  const labels: Record<ToolType, string> = {
    read: 'Read',
    search: 'Searched',
    edit: name === 'Write' ? 'Created' : 'Edited',
    command: 'Ran command',
    agent: 'Agent',
  };
  return labels[type];
}

function ToolBlock({ tool }: { tool: ToolCallDisplay }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const toolType = getToolType(tool.name);

  let status: 'done' | 'running' | 'error' = 'done';
  if (tool.output === undefined && !tool.progressLines) {
    status = 'running';
  } else if (tool.output?.startsWith('Error:')) {
    status = 'error';
  }

  const color = status === 'error'
    ? 'var(--danger)'
    : status === 'running'
      ? 'var(--text-muted)'
      : getToolColor(tool.name);

  const fileName = tool.input.file_path
    ? String(tool.input.file_path).split('/').pop()
    : null;

  return (
    <div className="tool-block">
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
        <span className={`tool-icon ${status === 'running' ? 'tool-icon--spinning' : ''}`} style={{ color }}>
          {status === 'running' ? <SpinnerIcon size={15} /> : <ToolIcon name={tool.name} size={15} />}
        </span>

        <span className="tool-block-label">{getToolLabel(tool.name, toolType)}</span>

        {fileName && <span className="tool-file-badge">{fileName}</span>}

        {tool.output && (
          <span className="tool-block-expand">
            {isExpanded ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
          </span>
        )}
      </div>

      {isExpanded && tool.output && (
        <div className="tool-block-content">
          <pre className="tool-block-output">{tool.output}</pre>
        </div>
      )}
    </div>
  );
}

function ReadGroup({ tools }: { tools: ToolCallDisplay[] }) {
  const allDone = tools.every(t => t.output && !t.output.startsWith('Error:'));
  const anyRunning = tools.some(t => t.output === undefined);
  const status: 'done' | 'running' | 'error' = anyRunning ? 'running' : allDone ? 'done' : 'error';

  const color = status === 'error'
    ? 'var(--danger)'
    : status === 'running'
      ? 'var(--text-muted)'
      : getToolColor('Read');

  return (
    <div className="tool-block">
      <div className="tool-block-header">
        <span className={`tool-icon ${status === 'running' ? 'tool-icon--spinning' : ''}`} style={{ color }}>
          {status === 'running' ? <SpinnerIcon size={15} /> : <ToolIcon name="Read" size={15} />}
        </span>
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
      </div>
    </div>
  );
}

function TaskBlock({ tool }: { tool: ToolCallDisplay }) {
  const isRunning = tool.output === undefined;

  const tasks = tool.progressLines?.map((line) => {
    const isDone = line.startsWith('[x]') || line.startsWith('[done]');
    return { label: line.replace(/^\[(x|done|pending|\s)\]\s*/, ''), done: isDone };
  });

  if (!tasks || tasks.length === 0) {
    return (
      <div className="task-module">
        <div className="task-module-header">
          <span className={`tool-icon ${isRunning ? 'tool-icon--spinning' : ''}`} style={{ color: '#818cf8' }}>
            {isRunning ? <SpinnerIcon size={15} /> : <ToolIcon name="Agent" size={15} />}
          </span>
          <span className="task-module-title">Agent</span>
          {isRunning && <span className="task-module-status">running...</span>}
        </div>
      </div>
    );
  }

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="task-module">
      <div className="task-module-header">
        <span className={`tool-icon ${isRunning ? 'tool-icon--spinning' : ''}`} style={{ color: '#818cf8' }}>
          {isRunning ? <SpinnerIcon size={15} /> : <ToolIcon name="Agent" size={15} />}
        </span>
        <span className="task-module-title">Agent Task</span>
        <span className="task-module-count">{doneCount}/{tasks.length}</span>
      </div>
      <div className="task-module-list">
        {tasks.map((task, i) => (
          <div key={i} className={`task-item ${task.done ? 'task-item--done' : ''}`}>
            {task.done ? (
              <CheckCircle size={15} weight="fill" className="task-item-check" />
            ) : isRunning && i === doneCount ? (
              <CircleNotch size={15} weight="bold" className="task-item-spinner tool-spinner" />
            ) : (
              <span className="task-item-circle" />
            )}
            <span className="task-item-label">{task.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(function AIMessage({ message }: { message: DisplayMessage }) {
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
      <div className={`message-avatar message-avatar--ai ${message.isStreaming ? 'streaming' : ''}`}>
        <CodeyeMark size={20} animate={message.isStreaming ? 'thinking' : 'idle'} />
      </div>

      <div className="message-content-wrapper">
        <div className="message-header">
          <span className="message-sender">Codeye</span>
        </div>

        <div className="ai-message-flat">
          {groupedTools.map((item, idx) => {
            if ('kind' in item && item.kind === 'group') {
              return <ReadGroup key={`group-${idx}`} tools={item.tools} />;
            }
            const tool = item as ToolCallDisplay;
            if (tool.name === 'Agent' || tool.name === 'Task') {
              return <TaskBlock key={tool.id} tool={tool} />;
            }
            return <ToolBlock key={tool.id} tool={tool} />;
          })}

          {isThinking && (
            <div className="thinking-block">
              <SpinnerIcon size={15} />
              <span className="thinking-text">Thinking</span>
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
