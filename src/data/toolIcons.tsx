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
  ListPlus,
  ListChecks,
  Sparkle,
  ChatCircle,
  Browser,
  Plug,
} from '@phosphor-icons/react';

const WEIGHT = 'bold' as const;

export function ToolIcon({ name, size = 14 }: { name: string; size?: number }) {
  const props = { size, weight: WEIGHT } as const;

  // MCP tools: extract category from mcp__<server>__<action>
  if (name.startsWith('mcp__')) {
    if (name.includes('playwright')) return <Browser {...props} />;
    if (name.includes('exa'))        return <GlobeSimple {...props} />;
    return <Plug {...props} />;
  }

  switch (name) {
    case 'Read':            return <Eye {...props} />;
    case 'Write':           return <FilePlus {...props} />;
    case 'Edit':            return <PencilSimple {...props} />;
    case 'Bash':            return <TerminalWindow {...props} />;
    case 'Grep':
    case 'ToolSearch':      return <MagnifyingGlass {...props} />;
    case 'Glob':            return <FolderOpen {...props} />;
    case 'WebSearch':       return <GlobeSimple {...props} />;
    case 'WebFetch':        return <Link {...props} />;
    case 'Agent':
    case 'Task':            return <Robot {...props} />;
    case 'TaskCreate':      return <ListPlus {...props} />;
    case 'TaskUpdate':      return <ListChecks {...props} />;
    case 'Skill':           return <Sparkle {...props} />;
    case 'AskUserQuestion': return <ChatCircle {...props} />;
    default:                return <Lightning {...props} />;
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
