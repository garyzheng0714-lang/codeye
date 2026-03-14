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
