import {
  Eye,
  FilePlus,
  PencilSimple,
  TerminalWindow,
  MagnifyingGlass,
  FolderOpen,
  GlobeSimple,
  Link,
  Robot,
  Lightning,
  CircleNotch,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react';

const WEIGHT = 'bold' as const;

export function ToolIcon({ name, size = 14 }: { name: string; size?: number }) {
  const props = { size, weight: WEIGHT } as const;
  switch (name) {
    case 'Read':      return <Eye {...props} />;
    case 'Write':     return <FilePlus {...props} />;
    case 'Edit':      return <PencilSimple {...props} />;
    case 'Bash':      return <TerminalWindow {...props} />;
    case 'Grep':      return <MagnifyingGlass {...props} />;
    case 'Glob':      return <FolderOpen {...props} />;
    case 'WebSearch': return <GlobeSimple {...props} />;
    case 'WebFetch':  return <Link {...props} />;
    case 'Agent':
    case 'Task':      return <Robot {...props} />;
    default:          return <Lightning {...props} />;
  }
}

export function SpinnerIcon({ size = 14 }: { size?: number }) {
  return <CircleNotch size={size} weight="bold" className="tool-spinner" />;
}

export function SuccessIcon({ size = 14 }: { size?: number }) {
  return <CheckCircle size={size} weight="fill" />;
}

export function ErrorIcon({ size = 14 }: { size?: number }) {
  return <XCircle size={size} weight="fill" />;
}
