export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  installed: boolean;
  category: SkillCategory;
  promptTemplate?: string;
  allowedTools?: string[];
}

export type SkillCategory = 'code' | 'review' | 'test' | 'docs' | 'devops' | 'custom';

import { readJson, writeJson } from '../utils/jsonStorage';

const SKILLS_STORAGE_KEY = 'codeye.installed-skills';

export function loadInstalledSkills(): Skill[] {
  return readJson<Skill[]>(SKILLS_STORAGE_KEY) ?? [];
}

function saveInstalledSkills(skills: Skill[]): void {
  writeJson(SKILLS_STORAGE_KEY, skills);
}

export function installSkill(skill: Omit<Skill, 'installed'>): Skill {
  const installed: Skill = { ...skill, installed: true };
  const skills = loadInstalledSkills();
  const existingIndex = skills.findIndex((s) => s.id === skill.id);

  if (existingIndex >= 0) {
    skills[existingIndex] = installed;
  } else {
    skills.push(installed);
  }

  saveInstalledSkills(skills);
  return installed;
}

export function uninstallSkill(id: string): void {
  saveInstalledSkills(loadInstalledSkills().filter((s) => s.id !== id));
}

export const BUILTIN_SKILLS: Omit<Skill, 'installed'>[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for quality, security, and best practices',
    version: '1.0.0',
    author: 'Codeye',
    category: 'review',
    promptTemplate: 'Please review the following code for quality, security, and best practices:\n\n{{input}}',
    allowedTools: ['Read', 'Grep', 'Glob'],
  },
  {
    id: 'write-tests',
    name: 'Write Tests',
    description: 'Generate tests for code using TDD approach',
    version: '1.0.0',
    author: 'Codeye',
    category: 'test',
    promptTemplate: 'Write comprehensive tests for:\n\n{{input}}\n\nUse TDD approach: write tests first, then verify.',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
  },
  {
    id: 'explain-code',
    name: 'Explain Code',
    description: 'Explain code in plain language',
    version: '1.0.0',
    author: 'Codeye',
    category: 'docs',
    promptTemplate: 'Explain the following code in plain language, covering its purpose, logic flow, and key decisions:\n\n{{input}}',
    allowedTools: ['Read', 'Grep', 'Glob'],
  },
  {
    id: 'refactor',
    name: 'Refactor',
    description: 'Refactor code for better readability and maintainability',
    version: '1.0.0',
    author: 'Codeye',
    category: 'code',
    promptTemplate: 'Refactor the following code for better readability, maintainability, and performance:\n\n{{input}}',
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
  },
];
