import { memo } from 'react';
import { useChatStore } from '../../stores/chatStore';
import type { ToolCallDisplay } from '../../types';
import { getToolIcon, toolTypeMap } from '../../data/toolIcons';
import DiffViewer from './DiffViewer';

function getToolSummary(tool: ToolCallDisplay): string {
  const input = tool.input;
  if (input.file_path) return String(input.file_path).split('/').pop() || '';
  if (input.command) return String(input.command).slice(0, 60);
  if (input.pattern) return String(input.pattern);
  if (input.query) return String(input.query).slice(0, 60);
  return '';
}

function isEditTool(tool: ToolCallDisplay): boolean {
  return tool.name === 'Edit' && typeof tool.input.old_string === 'string' && typeof tool.input.new_string === 'string';
}

function renderExpandedContent(tool: ToolCallDisplay) {
  if (isEditTool(tool)) {
    return (
      <DiffViewer
        oldText={String(tool.input.old_string)}
        newText={String(tool.input.new_string)}
        fileName={tool.input.file_path ? String(tool.input.file_path).split('/').pop() : undefined}
      />
    );
  }

  return (
    <>
      <pre className="tool-call-json">{JSON.stringify(tool.input, null, 2)}</pre>
      {tool.output && (
        <>
          <div className="tool-output-label">Output</div>
          <pre className="tool-call-json">{tool.output}</pre>
        </>
      )}
    </>
  );
}

export default memo(function ToolCall({ tool, messageId }: { tool: ToolCallDisplay; messageId: string }) {
  const { toggleToolExpand } = useChatStore();
  const toolType = toolTypeMap[tool.name] || 'read';
  const summary = getToolSummary(tool);

  return (
    <div className="tool-call" data-tool-type={toolType}>
      <button
        className="tool-call-header"
        onClick={() => toggleToolExpand(messageId, tool.id)}
      >
        {getToolIcon(tool.name)}
        <span className="tool-name">{tool.name}</span>
        <span className="tool-summary">{summary}</span>
        <span className={`tool-chevron ${tool.expanded ? 'expanded' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {tool.expanded && (
        <div className="tool-call-detail">
          {renderExpandedContent(tool)}
        </div>
      )}
    </div>
  );
});
