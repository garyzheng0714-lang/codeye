import { useChatStore, type ToolCallDisplay } from '../../stores/chatStore';

const toolTypeMap: Record<string, string> = {
  Read: 'read', Write: 'write', Edit: 'edit',
  Bash: 'bash', Glob: 'read', Grep: 'read',
  WebSearch: 'websearch', WebFetch: 'webfetch',
};

export default function ToolCall({ tool, messageId }: { tool: ToolCallDisplay; messageId: string }) {
  const { toggleToolExpand } = useChatStore();
  const toolType = toolTypeMap[tool.name] || 'read';
  const summary = getToolSummary(tool);

  return (
    <div className="tool-call" data-tool-type={toolType}>
      <button
        className="tool-call-header"
        onClick={() => toggleToolExpand(messageId, tool.id)}
      >
        <ToolIcon name={tool.name} />
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
          <pre className="tool-call-json">{JSON.stringify(tool.input, null, 2)}</pre>
          {tool.output && (
            <>
              <div className="tool-output-label">Output</div>
              <pre className="tool-call-json">{tool.output}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function getToolSummary(tool: ToolCallDisplay): string {
  const input = tool.input;
  if (input.file_path) return String(input.file_path).split('/').pop() || '';
  if (input.command) return String(input.command).slice(0, 60);
  if (input.pattern) return String(input.pattern);
  if (input.query) return String(input.query).slice(0, 60);
  return '';
}

function ToolIcon({ name }: { name: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    Read: (
      <svg className="tool-icon" viewBox="0 0 18 18" fill="none">
        <path d="M4 2h7l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" />
        <path d="M11 2v4h4" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
    Write: (
      <svg className="tool-icon" viewBox="0 0 18 18" fill="none">
        <path d="M12.5 2.5l3 3-9 9H3.5v-3l9-9z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
    Edit: (
      <svg className="tool-icon" viewBox="0 0 18 18" fill="none">
        <path d="M12.5 2.5l3 3-9 9H3.5v-3l9-9z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
    Bash: (
      <svg className="tool-icon" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 9l2.5 2L5 13M9 13h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    Glob: (
      <svg className="tool-icon" viewBox="0 0 18 18" fill="none">
        <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    Grep: (
      <svg className="tool-icon" viewBox="0 0 18 18" fill="none">
        <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    WebSearch: (
      <svg className="tool-icon" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2 9h14M9 2c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7z" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
    WebFetch: (
      <svg className="tool-icon" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2 9h14M9 2c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7z" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  };

  return iconMap[name] || (
    <svg className="tool-icon" viewBox="0 0 18 18" fill="none">
      <path d="M7 2l-4 7h5l-1 7 6-9h-5l2-5H7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
