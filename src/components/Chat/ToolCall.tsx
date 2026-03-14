import { useState, memo } from 'react';
import { useChatStore } from '../../stores/chatStore';
import type { ToolCallDisplay } from '../../types';
import { getToolStatus, getSemanticName, getToolColor } from '../../data/toolMeta';
import { ToolIcon, SpinnerIcon } from '../../data/toolIcons';
import DiffViewer from './DiffViewer';

function getFileName(tool: ToolCallDisplay): string | null {
  if (tool.input.file_path) return String(tool.input.file_path).split('/').pop() || null;
  return null;
}

function ToolStatusIcon({ name, status }: { name: string; status: ReturnType<typeof getToolStatus> }) {
  const isRunning = status === 'running' || status === 'pending';
  const isError = status === 'error';
  const color = isError ? 'var(--danger)' : isRunning ? 'var(--text-muted)' : getToolColor(name);
  return (
    <span className="tool-icon" style={{ color }}>
      {isRunning ? <SpinnerIcon size={14} /> : <ToolIcon name={name} size={14} />}
    </span>
  );
}

function BashInline({ tool }: { tool: ToolCallDisplay }) {
  const [expanded, setExpanded] = useState(false);
  const command = tool.input.command ? String(tool.input.command) : '';
  const output = tool.output || '';
  const lines = output.split('\n').filter(Boolean);
  const PREVIEW = 5;
  const visible = expanded ? lines : lines.slice(0, PREVIEW);

  if (!command && !output) return null;

  return (
    <div className="tool-bash-inline">
      {command && <code className="tool-bash-cmd">{command}</code>}
      {lines.length > 0 && (
        <div className="tool-bash-out">
          {visible.map((line, i) => (
            <div key={i} className="tool-bash-out-line">{line}</div>
          ))}
          {lines.length > PREVIEW && !expanded && (
            <button className="tool-bash-more-btn" onClick={() => setExpanded(true)}>
              +{lines.length - PREVIEW} more lines
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(function ToolCall({ tool, messageId, index = 0 }: { tool: ToolCallDisplay; messageId: string; index?: number }) {
  const toggleToolExpand = useChatStore((s) => s.toggleToolExpand);
  const [diffOpen, setDiffOpen] = useState(false);

  const status = getToolStatus(tool);
  const semanticName = getSemanticName(tool.name);
  const fileName = getFileName(tool);
  const isEdit = tool.name === 'Edit' && typeof tool.input.old_string === 'string';
  const isBash = tool.name === 'Bash';
  const isSearch = tool.name === 'Glob' || tool.name === 'Grep';
  const searchPattern = tool.input.pattern ? String(tool.input.pattern) : tool.input.query ? String(tool.input.query) : null;
  const searchCount = isSearch && tool.output
    ? tool.output.split('\n').filter(Boolean).length
    : 0;

  const isClickable = isSearch || (isEdit && status === 'success');

  return (
    <div className={`tool-card tool-card--${status}`} style={{ '--tool-index': index } as React.CSSProperties}>
      <div
        className={`tool-card-row ${isClickable ? 'tool-card-row--clickable' : ''}`}
        onClick={
          isSearch ? () => toggleToolExpand(messageId, tool.id)
          : isEdit && status === 'success' ? () => setDiffOpen((v) => !v)
          : undefined
        }
      >
        <ToolStatusIcon name={tool.name} status={status} />

        <span className="tool-card-label">{semanticName}</span>

        {fileName && <span className="tool-file-badge">{fileName}</span>}
        {!fileName && searchPattern && <span className="tool-file-badge">{searchPattern}</span>}

        {isSearch && searchCount > 0 && (
          <span className="tool-count-badge">{searchCount} results</span>
        )}
        {tool.name === 'Read' && tool.output && (
          <span className="tool-count-badge">{tool.output.split('\n').length} lines</span>
        )}

        {isEdit && status === 'success' && (
          <button
            className={`tool-diff-btn ${diffOpen ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setDiffOpen((v) => !v); }}
            title={diffOpen ? 'Hide diff' : 'Show diff'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {isSearch && tool.output && (
          <span className={`tool-expand-icon ${tool.expanded ? 'open' : ''}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>

      {isBash && <BashInline tool={tool} />}

      {isEdit && diffOpen && (
        <div className="tool-diff-body">
          <DiffViewer
            oldText={String(tool.input.old_string)}
            newText={String(tool.input.new_string || '')}
            fileName={fileName || undefined}
          />
        </div>
      )}

      {isSearch && tool.expanded && tool.output && (
        <div className="tool-search-inline">
          {tool.output.split('\n').filter(Boolean).map((line, i) => (
            <div key={i} className="tool-search-line">{line}</div>
          ))}
        </div>
      )}
    </div>
  );
});
