type ContextType = 'file' | 'folder' | 'url' | 'codebase' | 'git_diff' | 'terminal' | 'code';

interface ContextReference {
  type: ContextType;
  value: string;
  displayLabel: string;
  resolved?: string;
}

const VALUE_PATTERN = /#(file|folder|url|code)\s+(\S+)/g;
const STANDALONE_PATTERN = /#(codebase|git_diff|terminal)\b/g;

export function parseContextReferences(input: string): ContextReference[] {
  const refs: ContextReference[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = VALUE_PATTERN.exec(input)) !== null) {
    const type = match[1] as ContextType;
    const value = match[2] ?? '';
    const key = `${type}:${value}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ type, value, displayLabel: formatLabel(type, value) });
    }
  }

  while ((match = STANDALONE_PATTERN.exec(input)) !== null) {
    const type = match[1] as ContextType;
    const key = `${type}:`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ type, value: '', displayLabel: formatLabel(type, '') });
    }
  }

  return refs;
}

export function stripContextReferences(input: string): string {
  return input
    .replace(VALUE_PATTERN, '')
    .replace(STANDALONE_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatLabel(type: ContextType, value: string): string {
  switch (type) {
    case 'file':
      return value ? `File: ${value.split('/').pop()}` : '#file';
    case 'folder':
      return value ? `Folder: ${value.split('/').pop()}` : '#folder';
    case 'url':
      return value ? `URL: ${truncate(value, 40)}` : '#url';
    case 'codebase':
      return 'Codebase';
    case 'git_diff':
      return 'Git Diff';
    case 'terminal':
      return 'Terminal Output';
    case 'code':
      return value ? `Code: ${truncate(value, 30)}` : '#code';
    default:
      return `#${type}`;
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max - 1)}...` : str;
}

export function buildContextPrompt(refs: ContextReference[]): string {
  if (refs.length === 0) return '';

  const parts = refs.map((ref) => {
    switch (ref.type) {
      case 'file':
        return `[Context: Read file "${ref.value}"]`;
      case 'folder':
        return `[Context: Explore folder "${ref.value}"]`;
      case 'url':
        return `[Context: Fetch URL "${ref.value}"]`;
      case 'codebase':
        return '[Context: Search the codebase]';
      case 'git_diff':
        return '[Context: Show git diff]';
      case 'terminal':
        return '[Context: Include terminal output]';
      case 'code':
        return `[Context: Reference code "${ref.value}"]`;
      default:
        return '';
    }
  }).filter(Boolean);

  return parts.join('\n');
}

export const CONTEXT_SUGGESTIONS: { type: ContextType; trigger: string; description: string }[] = [
  { type: 'file', trigger: '#file', description: 'Reference a file' },
  { type: 'folder', trigger: '#folder', description: 'Reference a folder' },
  { type: 'codebase', trigger: '#codebase', description: 'Search the codebase' },
  { type: 'git_diff', trigger: '#git_diff', description: 'Include git diff' },
  { type: 'url', trigger: '#url', description: 'Fetch a URL' },
  { type: 'terminal', trigger: '#terminal', description: 'Include terminal output' },
  { type: 'code', trigger: '#code', description: 'Reference code snippet' },
];
