export interface SlashCommand {
  name: string;
  description: string;
  category: 'mode' | 'model' | 'skill' | 'action';
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

  // Skills
  { name: 'commit', description: 'Create a git commit with staged changes', category: 'skill', icon: 'git' },
  { name: 'build-fix', description: 'Fix build and type errors incrementally', category: 'skill', icon: 'build' },
  { name: 'code-review', description: 'Security and quality review of changes', category: 'skill', icon: 'review' },
  { name: 'tdd', description: 'Test-driven development workflow', category: 'skill', icon: 'test' },
  { name: 'e2e', description: 'Generate and run E2E tests with Playwright', category: 'skill', icon: 'test' },
  { name: 'plan', description: 'Create implementation plan before coding', category: 'skill', icon: 'plan' },
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
];

export const categoryLabels: Record<string, string> = {
  mode: 'Modes',
  model: 'Models',
  skill: 'Skills',
  action: 'Actions',
};

export function filterCommands(query: string): SlashCommand[] {
  const q = query.toLowerCase();
  if (!q) return slashCommands;
  return slashCommands.filter(
    (c) => c.name.includes(q) || c.description.toLowerCase().includes(q)
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
