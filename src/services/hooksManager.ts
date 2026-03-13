export type HookTrigger = 'PreToolUse' | 'PostToolUse' | 'Stop';

export interface HookDefinition {
  id: string;
  trigger: HookTrigger;
  pattern: string;
  command: string;
  enabled: boolean;
  description?: string;
}

export interface McpServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  lastTestedAt?: number;
  lastTestResult?: 'success' | 'error';
}

import { readJson, writeJson } from '../utils/jsonStorage';

const HOOKS_STORAGE_KEY = 'codeye.hooks';
const MCP_STORAGE_KEY = 'codeye.mcp-servers';

export function loadHooks(): HookDefinition[] {
  return readJson<HookDefinition[]>(HOOKS_STORAGE_KEY) ?? [];
}

export function saveHooks(hooks: HookDefinition[]): void {
  writeJson(HOOKS_STORAGE_KEY, hooks);
}

export function addHook(hook: Omit<HookDefinition, 'id'>): HookDefinition {
  const hooks = loadHooks();
  const newHook: HookDefinition = { ...hook, id: crypto.randomUUID() };
  hooks.push(newHook);
  saveHooks(hooks);
  return newHook;
}

export function updateHook(id: string, updates: Partial<Omit<HookDefinition, 'id'>>): void {
  const hooks = loadHooks().map((h) =>
    h.id === id ? { ...h, ...updates } : h
  );
  saveHooks(hooks);
}

export function removeHook(id: string): void {
  saveHooks(loadHooks().filter((h) => h.id !== id));
}

export function loadMcpServers(): McpServerConfig[] {
  return readJson<McpServerConfig[]>(MCP_STORAGE_KEY) ?? [];
}

export function saveMcpServers(servers: McpServerConfig[]): void {
  writeJson(MCP_STORAGE_KEY, servers);
}

export function addMcpServer(server: Omit<McpServerConfig, 'id'>): McpServerConfig {
  const servers = loadMcpServers();
  const newServer: McpServerConfig = { ...server, id: crypto.randomUUID() };
  servers.push(newServer);
  saveMcpServers(servers);
  return newServer;
}

export function removeMcpServer(id: string): void {
  saveMcpServers(loadMcpServers().filter((s) => s.id !== id));
}

export function exportHooksConfig(): string {
  return JSON.stringify({
    hooks: loadHooks(),
    mcpServers: loadMcpServers(),
  }, null, 2);
}

export function importHooksConfig(json: string): { hooks: number; mcpServers: number } {
  const parsed = JSON.parse(json) as {
    hooks?: HookDefinition[];
    mcpServers?: McpServerConfig[];
  };

  let hookCount = 0;
  let mcpCount = 0;

  if (Array.isArray(parsed.hooks)) {
    saveHooks(parsed.hooks);
    hookCount = parsed.hooks.length;
  }

  if (Array.isArray(parsed.mcpServers)) {
    saveMcpServers(parsed.mcpServers);
    mcpCount = parsed.mcpServers.length;
  }

  return { hooks: hookCount, mcpServers: mcpCount };
}
