export type ToolStatus = 'pending' | 'running' | 'error' | 'success';

export function getToolStatus(tool: { name: string; output?: string }): ToolStatus {
  if (tool.output === undefined) return 'pending';
  if (tool.output?.startsWith('Error') || tool.output?.startsWith('error')) return 'error';
  return 'success';
}

const semanticNames: Record<string, string> = {
  Read: 'Read file',
  Write: 'Create',
  Edit: 'Edit',
  Bash: 'Command',
  Glob: 'Search files',
  Grep: 'Search',
  WebSearch: 'Web search',
  WebFetch: 'Fetch',
  Agent: 'Agent',
  Task: 'Agent',
};

export function getSemanticName(name: string): string {
  return semanticNames[name] || name;
}

export function getToolColor(name: string): string {
  switch (name) {
    case 'Read':
      return '#34d399';
    case 'Write':
      return '#34d399';
    case 'Edit':
      return '#fbbf24';
    case 'Bash':
      return 'var(--text-secondary)';
    case 'Grep':
    case 'Glob':
      return '#38bdf8';
    case 'WebSearch':
      return '#a855f7';
    case 'WebFetch':
      return '#a855f7';
    case 'Agent':
    case 'Task':
      return '#818cf8';
    default:
      return 'var(--text-muted)';
  }
}
