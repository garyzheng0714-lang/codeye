import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetSlashCommandCachesForTest,
  filterCommands,
  setRuntimeSlashCommands,
} from './slashCommands';

const RUNTIME_COMMAND_NAMES_KEY = 'codeye.runtime-slash-command-names';

describe('built-in gstack skill commands', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: mockStorage });
    localStorage.setItem(RUNTIME_COMMAND_NAMES_KEY, JSON.stringify([]));
    __resetSlashCommandCachesForTest();
  });

  it('includes plan-eng-review with specific description', () => {
    const cmd = filterCommands('plan-eng-review').find((c) => c.name === 'plan-eng-review');
    expect(cmd).toBeTruthy();
    expect(cmd?.category).toBe('skill');
    expect(cmd?.description).not.toContain('Plugin command');
    expect(cmd?.description).not.toContain('loaded from Claude runtime');
  });

  it('includes plan-ceo-review with specific description', () => {
    const cmd = filterCommands('plan-ceo-review').find((c) => c.name === 'plan-ceo-review');
    expect(cmd).toBeTruthy();
    expect(cmd?.category).toBe('skill');
    expect(cmd?.description).not.toContain('Plugin command');
  });

  it('includes plan-design-review with specific description', () => {
    const cmd = filterCommands('plan-design-review').find((c) => c.name === 'plan-design-review');
    expect(cmd).toBeTruthy();
    expect(cmd?.category).toBe('skill');
  });

  it('includes writing-plans and executing-plans without superpowers prefix', () => {
    const writing = filterCommands('writing-plans').find((c) => c.name === 'writing-plans');
    const executing = filterCommands('executing-plans').find((c) => c.name === 'executing-plans');
    expect(writing).toBeTruthy();
    expect(executing).toBeTruthy();
    expect(writing?.description).not.toContain('Plugin command');
    expect(executing?.description).not.toContain('Plugin command');
  });

  it('includes qa, browse, ship, and review as built-in skills', () => {
    const qa = filterCommands('qa').find((c) => c.name === 'qa');
    const browse = filterCommands('browse').find((c) => c.name === 'browse');
    const ship = filterCommands('ship').find((c) => c.name === 'ship');
    expect(qa).toBeTruthy();
    expect(browse).toBeTruthy();
    expect(ship).toBeTruthy();
  });
});

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
