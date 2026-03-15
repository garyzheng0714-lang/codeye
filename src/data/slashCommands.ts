export interface SlashCommand {
  name: string;
  description: string;
  category: 'mode' | 'model' | 'effort' | 'skill' | 'action';
  icon: string;
}

const slashCommands: SlashCommand[] = [
  // Modes
  { name: 'chat', description: 'Ask questions, get explanations', category: 'mode', icon: 'chat' },
  { name: 'code', description: 'Write, edit, and debug code', category: 'mode', icon: 'code' },
  { name: 'plan', description: 'Plan architecture and strategies', category: 'mode', icon: 'plan' },

  // Models
  { name: 'opus', description: 'Switch to Opus (deepest reasoning)', category: 'model', icon: 'model' },
  { name: 'sonnet', description: 'Switch to Sonnet (best for coding)', category: 'model', icon: 'model' },
  { name: 'haiku', description: 'Switch to Haiku (fastest, lowest cost)', category: 'model', icon: 'model' },

  // Effort / Thinking
  { name: 'think-low', description: 'Minimal thinking, fastest responses', category: 'effort', icon: 'effort' },
  { name: 'think-med', description: 'Balanced speed and thinking depth', category: 'effort', icon: 'effort' },
  { name: 'think-high', description: 'Deep thinking, thorough responses', category: 'effort', icon: 'effort' },

  // Skills
  { name: 'commit', description: 'Create a git commit with staged changes', category: 'skill', icon: 'git' },
  { name: 'build-fix', description: 'Fix build and type errors incrementally', category: 'skill', icon: 'build' },
  { name: 'code-review', description: 'Security and quality review of changes', category: 'skill', icon: 'review' },
  { name: 'tdd', description: 'Test-driven development workflow', category: 'skill', icon: 'test' },
  { name: 'e2e', description: 'Generate and run E2E tests with Playwright', category: 'skill', icon: 'test' },
  { name: 'impl-plan', description: 'Create implementation plan before coding', category: 'skill', icon: 'plan' },
  { name: 'refactor-clean', description: 'Remove dead code and unused dependencies', category: 'skill', icon: 'clean' },
  { name: 'security-scan', description: 'Scan configuration for vulnerabilities', category: 'skill', icon: 'security' },
  { name: 'search-first', description: 'Research before coding workflow', category: 'skill', icon: 'search' },
  { name: 'simplify', description: 'Review code for reuse, quality, efficiency', category: 'skill', icon: 'clean' },
  { name: 'save-session', description: 'Save current session state to file', category: 'skill', icon: 'save' },
  { name: 'resume-session', description: 'Resume work from saved session', category: 'skill', icon: 'restore' },

  // Actions
  { name: 'clear', description: 'Clear current conversation', category: 'action', icon: 'clear' },
  { name: 'new', description: 'Start a new session', category: 'action', icon: 'new' },
  { name: 'help', description: 'Show available commands and shortcuts', category: 'action', icon: 'help' },
  { name: 'compact', description: 'Compress conversation context', category: 'action', icon: 'compact' },
  { name: 'review', description: 'Review current changes and suggest improvements', category: 'action', icon: 'review' },
  { name: 'doctor', description: 'Diagnose project issues and suggest fixes', category: 'action', icon: 'help' },
  { name: 'bug', description: 'Report and analyze a bug with context', category: 'action', icon: 'build' },
  { name: 'config', description: 'Show and edit project configuration', category: 'action', icon: 'plan' },
];

export const slashCommandCategoryOrder: SlashCommand['category'][] = [
  'mode',
  'model',
  'effort',
  'skill',
  'action',
];

export const categoryLabels: Record<SlashCommand['category'], string> = {
  mode: 'Modes',
  model: 'Models',
  effort: 'Thinking',
  skill: 'Skills',
  action: 'Actions',
};

import { getDefaultStorageAdapter } from '../storage/adapter';
import { migrateCommandsV1ToV2 } from '../migrations/v1-to-v2-commands';

const CUSTOM_COMMANDS_KEY = 'codeye.custom-commands';
const RUNTIME_COMMAND_NAMES_KEY = 'codeye.runtime-slash-command-names';
let cachedCustomCommands: SlashCommand[] | null = null;
let cachedRuntimeCommandNames: string[] | null = null;

const MODE_COMMANDS = new Set(['chat', 'code', 'plan']);
const MODEL_COMMANDS = new Set(['opus', 'sonnet', 'haiku']);
const EFFORT_COMMANDS = new Set(['think-low', 'think-med', 'think-high']);
const ACTION_COMMANDS = new Set(['clear', 'new', 'help', 'compact', 'review', 'doctor', 'bug', 'config']);

function loadCustomCommands(): SlashCommand[] {
  if (cachedCustomCommands) {
    return cachedCustomCommands;
  }
  const adapter = getDefaultStorageAdapter();
  const raw = adapter.getItem(CUSTOM_COMMANDS_KEY);
  const parsed = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
  const doc = migrateCommandsV1ToV2(parsed);

  // If raw data was v1 (plain array or null), persist migrated v2 doc and backup original
  if (raw !== null) {
    let isAlreadyV2 = false;
    try {
      const existing = JSON.parse(raw);
      isAlreadyV2 = typeof existing === 'object' && existing !== null && existing._schemaVersion === 2;
    } catch { /* noop */ }
    if (!isAlreadyV2) {
      adapter.setItem('_backup_v1_' + CUSTOM_COMMANDS_KEY, raw);
      adapter.setItem(CUSTOM_COMMANDS_KEY, JSON.stringify(doc));
    }
  }

  cachedCustomCommands = doc.commands.map((cmd) => ({
    name: cmd.name,
    description: cmd.description ?? cmd.prompt,
    category: 'skill' as SlashCommand['category'],
    icon: 'build',
  }));
  return cachedCustomCommands;
}

function loadRuntimeCommandNames(): string[] {
  if (cachedRuntimeCommandNames) {
    return cachedRuntimeCommandNames;
  }
  const adapter = getDefaultStorageAdapter();
  const raw = adapter.getItem(RUNTIME_COMMAND_NAMES_KEY);
  const parsed = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
  cachedRuntimeCommandNames = Array.isArray(parsed)
    ? parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
  return cachedRuntimeCommandNames;
}

function saveRuntimeCommandNames(names: string[]): void {
  cachedRuntimeCommandNames = names;
  getDefaultStorageAdapter().setItem(RUNTIME_COMMAND_NAMES_KEY, JSON.stringify(names));
}

function normalizeCommandName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withoutPrefix = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const firstToken = withoutPrefix.split(/\s+/)[0]?.trim();
  if (!firstToken) return null;
  return firstToken;
}

function dedupeNames(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

function inferCategory(name: string): SlashCommand['category'] {
  const normalized = name.toLowerCase();
  if (MODE_COMMANDS.has(normalized)) return 'mode';
  if (MODEL_COMMANDS.has(normalized)) return 'model';
  if (EFFORT_COMMANDS.has(normalized)) return 'effort';
  if (ACTION_COMMANDS.has(normalized)) return 'action';
  return 'skill';
}

function inferRuntimeDescription(name: string): string {
  if (name.includes(':')) return 'Plugin command loaded from Claude runtime';
  if (name.startsWith('mcp__')) return 'MCP command loaded from Claude runtime';
  return 'Skill loaded from Claude runtime';
}

function inferIcon(category: SlashCommand['category']): string {
  if (category === 'mode') return 'chat';
  if (category === 'model') return 'model';
  if (category === 'effort') return 'help';
  if (category === 'action') return 'help';
  return 'build';
}

function toRuntimeCommands(baseCommands: SlashCommand[], commandNames: string[]): SlashCommand[] {
  const baseNames = new Set(baseCommands.map((cmd) => cmd.name.toLowerCase()));
  const runtimeCommands: SlashCommand[] = [];

  for (const name of commandNames) {
    if (baseNames.has(name.toLowerCase())) continue;
    const category = inferCategory(name);
    runtimeCommands.push({
      name,
      description: inferRuntimeDescription(name),
      category,
      icon: inferIcon(category),
    });
  }

  return runtimeCommands;
}

function getAllCommands(): SlashCommand[] {
  const baseCommands = [...slashCommands, ...loadCustomCommands()];
  return [...baseCommands, ...toRuntimeCommands(baseCommands, loadRuntimeCommandNames())];
}

export function filterCommands(query: string): SlashCommand[] {
  const all = getAllCommands();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  );
}

export function groupByCategory(commands: SlashCommand[]): Record<string, SlashCommand[]> {
  const groups: Record<string, SlashCommand[]> = {};
  for (const cmd of commands) {
    if (!groups[cmd.category]) groups[cmd.category] = [];
    groups[cmd.category].push(cmd);
  }
  return groups;
}

export function getSlashCommandByName(name: string): SlashCommand | undefined {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return undefined;
  return getAllCommands().find((cmd) => cmd.name.toLowerCase() === normalized);
}

export function setRuntimeSlashCommands(payload: {
  slashCommands?: string[];
  skills?: string[];
}): void {
  const names = dedupeNames([
    ...(payload.slashCommands ?? []).map(normalizeCommandName).filter((value): value is string => Boolean(value)),
    ...(payload.skills ?? []).map(normalizeCommandName).filter((value): value is string => Boolean(value)),
  ]);

  if (names.length === 0) return;
  saveRuntimeCommandNames(names);
}

export function __resetSlashCommandCachesForTest(): void {
  cachedCustomCommands = null;
  cachedRuntimeCommandNames = null;
}
