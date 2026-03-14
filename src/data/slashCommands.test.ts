import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetSlashCommandCachesForTest,
  filterCommands,
  setRuntimeSlashCommands,
} from './slashCommands';

const RUNTIME_COMMAND_NAMES_KEY = 'codeye.runtime-slash-command-names';

describe('slashCommands runtime registry', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: mockStorage,
    });
    localStorage.setItem(RUNTIME_COMMAND_NAMES_KEY, JSON.stringify([]));
    __resetSlashCommandCachesForTest();
  });

  it('adds runtime skills into slash filtering results', () => {
    setRuntimeSlashCommands({
      slashCommands: ['agent-reach', 'everything-claude-code:agentic-engineering'],
      skills: ['agent-reach'],
    });

    const runtimeSkill = filterCommands('agent-reach').find((cmd) => cmd.name === 'agent-reach');
    const pluginCommand = filterCommands('agentic-engineering').find((cmd) =>
      cmd.name.includes('agentic-engineering')
    );

    expect(runtimeSkill).toBeTruthy();
    expect(runtimeSkill?.category).toBe('skill');
    expect(pluginCommand?.description).toContain('Plugin command');
  });

  it('normalizes and deduplicates runtime command names', () => {
    setRuntimeSlashCommands({
      slashCommands: ['/Agent-Reach', 'agent-reach', ' agent-reach   run '],
      skills: [],
    });

    const matches = filterCommands('agent-reach').filter((cmd) => cmd.name.toLowerCase() === 'agent-reach');
    expect(matches).toHaveLength(1);
  });
});
