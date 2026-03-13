import {
  Eye,
  FilePlus,
  Pencil,
  Terminal,
  Search,
  FolderSearch,
  Globe,
  Link,
  Bot,
  Loader2,
  Zap,
} from 'lucide-react';

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

/** Per-tool accent color (used when status is success) */
export function getToolColor(name: string): string {
  switch (name) {
    case 'Read':      return '#34d399'; // emerald
    case 'Write':     return '#34d399';
    case 'Edit':      return '#fbbf24'; // amber
    case 'Bash':      return 'var(--text-secondary)';
    case 'Grep':
    case 'Glob':      return '#38bdf8'; // sky
    case 'WebSearch': return '#a855f7'; // purple
    case 'WebFetch':  return '#a855f7';
    case 'Agent':
    case 'Task':      return '#818cf8'; // indigo
    default:          return 'var(--text-muted)';
  }
}

/** Lucide icon for each tool — inherits color from CSS */
export function ToolIcon({ name, size = 12 }: { name: string; size?: number }) {
  const props = { size, strokeWidth: 1.6 };
  switch (name) {
    case 'Read':      return <Eye {...props} />;
    case 'Write':     return <FilePlus {...props} />;
    case 'Edit':      return <Pencil {...props} />;
    case 'Bash':      return <Terminal {...props} />;
    case 'Grep':      return <Search {...props} />;
    case 'Glob':      return <FolderSearch {...props} />;
    case 'WebSearch': return <Globe {...props} />;
    case 'WebFetch':  return <Link {...props} />;
    case 'Agent':
    case 'Task':      return <Bot {...props} />;
    default:          return <Zap {...props} />;
  }
}

/** Animated spinner — inherits color from CSS */
export function SpinnerIcon({ size = 12 }: { size?: number }) {
  return <Loader2 size={size} strokeWidth={2} className="tool-spinner" />;
}
