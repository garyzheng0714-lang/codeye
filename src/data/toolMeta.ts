export type ToolStatus = 'pending' | 'running' | 'error' | 'success';

export function getToolStatus(
  tool: { name: string; output?: string },
  options?: { isStreaming?: boolean }
): ToolStatus {
  if (tool.output === undefined) {
    return options?.isStreaming ? 'pending' : 'success';
  }
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
  ToolSearch: 'Tool search',
  WebSearch: 'Web search',
  WebFetch: 'Fetch',
  Agent: 'Agent',
  Task: 'Agent',
  TaskCreate: 'Create task',
  TaskUpdate: 'Update task',
  Skill: 'Skill',
  AskUserQuestion: 'Question',
};

function getMcpSemanticName(name: string): string {
  // mcp__server__action → readable label
  const parts = name.replace('mcp__', '').split('__');
  if (parts.length >= 2) {
    const action = parts[parts.length - 1]
      .replace(/_/g, ' ')
      .replace(/^browser /, '');
    return action.charAt(0).toUpperCase() + action.slice(1);
  }
  return name;
}

export function getSemanticName(name: string): string {
  if (name.startsWith('mcp__')) return getMcpSemanticName(name);
  return semanticNames[name] || name;
}

export function getToolColor(name: string): string {
  if (name.startsWith('mcp__')) {
    if (name.includes('playwright')) return '#2dd4bf'; // teal
    if (name.includes('exa'))        return '#a855f7'; // purple
    return '#94a3b8'; // slate
  }

  switch (name) {
    case 'Read':
    case 'Write':
      return '#34d399';
    case 'Edit':
      return '#fbbf24';
    case 'Bash':
      return 'var(--text-secondary)';
    case 'Grep':
    case 'Glob':
    case 'ToolSearch':
      return '#38bdf8';
    case 'WebSearch':
    case 'WebFetch':
      return '#a855f7';
    case 'Agent':
    case 'Task':
    case 'TaskCreate':
    case 'TaskUpdate':
      return '#818cf8';
    case 'Skill':
      return '#a855f7';
    case 'AskUserQuestion':
      return '#a855f7';
    default:
      return 'var(--text-muted)';
  }
}
