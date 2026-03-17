import { IpcMain, dialog, BrowserWindow } from 'electron';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { watchProjectHistory, unwatchProjectHistory } from './historyWatcher';

interface ImportedToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  expanded: boolean;
}

interface ImportedDisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: ImportedToolCall[];
  timestamp: number;
}

interface ImportedClaudeSession {
  claudeSessionId: string;
  name: string;
  cwd: string;
  model?: string;
  messages: ImportedDisplayMessage[];
  inputTokens: number;
  outputTokens: number;
  createdAt: number;
  updatedAt: number;
}

interface GitStatusSnapshot {
  available: boolean;
  cwd: string;
  branch: string | null;
  dirty: boolean;
  ahead: number;
  behind: number;
}

function resolveProjectPath(folderPath: string): string {
  const resolved = path.resolve(folderPath);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function encodeClaudeProjectPath(folderPath: string): string {
  return resolveProjectPath(folderPath).replace(/[^a-zA-Z0-9]/g, '-');
}

function toTimestamp(value: unknown): number {
  if (typeof value !== 'string') return Date.now();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function truncateLabel(label: string, maxLength = 56): string {
  const compact = label.replace(/\s+/g, ' ').trim();
  if (!compact) return 'Claude Session';
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact;
}

function extractUserText(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .flatMap((block) => {
      if (
        block &&
        typeof block === 'object' &&
        'type' in block &&
        (block as { type?: unknown }).type === 'text' &&
        typeof (block as { text?: unknown }).text === 'string'
      ) {
        return [(block as { text: string }).text];
      }
      return [];
    })
    .join('\n\n')
    .trim();
}

function extractAssistantPayload(message: unknown): {
  text: string;
  toolCalls: ImportedToolCall[];
  model?: string;
  inputTokens: number;
  outputTokens: number;
} {
  if (!message || typeof message !== 'object') {
    return { text: '', toolCalls: [], inputTokens: 0, outputTokens: 0 };
  }

  const typedMessage = message as {
    content?: unknown;
    model?: unknown;
    usage?: {
      input_tokens?: unknown;
      output_tokens?: unknown;
    };
  };

  const content = typedMessage.content;
  const textParts: string[] = [];
  const toolCalls: ImportedToolCall[] = [];

  if (typeof content === 'string') {
    textParts.push(content);
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;

      if (
        'type' in block &&
        (block as { type?: unknown }).type === 'text' &&
        typeof (block as { text?: unknown }).text === 'string'
      ) {
        textParts.push((block as { text: string }).text);
      }

      if (
        'type' in block &&
        (block as { type?: unknown }).type === 'tool_use' &&
        typeof (block as { name?: unknown }).name === 'string'
      ) {
        const input =
          'input' in block &&
          block.input &&
          typeof block.input === 'object' &&
          !Array.isArray(block.input)
            ? (block.input as Record<string, unknown>)
            : {};

        toolCalls.push({
          id:
            typeof (block as { id?: unknown }).id === 'string'
              ? (block as { id: string }).id
              : crypto.randomUUID(),
          name: (block as { name: string }).name,
          input,
          expanded: false,
        });
      }
    }
  }

  const usage = typedMessage.usage;
  return {
    text: textParts.join('\n\n').trim(),
    toolCalls,
    model: typeof typedMessage.model === 'string' ? typedMessage.model : undefined,
    inputTokens: typeof usage?.input_tokens === 'number' ? usage.input_tokens : 0,
    outputTokens: typeof usage?.output_tokens === 'number' ? usage.output_tokens : 0,
  };
}

function parseClaudeHistoryFile(filePath: string): ImportedClaudeSession | null {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return null;

  const messages: ImportedDisplayMessage[] = [];
  let createdAt = Number.POSITIVE_INFINITY;
  let updatedAt = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let model: string | undefined;
  let cwd = '';
  let claudeSessionId = path.basename(filePath, '.jsonl');

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;

    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }

    const timestamp = toTimestamp(record.timestamp);
    createdAt = Math.min(createdAt, timestamp);
    updatedAt = Math.max(updatedAt, timestamp);

    if (typeof record.cwd === 'string' && !cwd) {
      cwd = record.cwd;
    }
    if (typeof record.sessionId === 'string') {
      claudeSessionId = record.sessionId;
    }

    if (record.type === 'user') {
      const message = record.message as { content?: unknown } | undefined;
      const text = extractUserText(message?.content);
      if (!text) continue;

      messages.push({
        id: typeof record.uuid === 'string' ? record.uuid : crypto.randomUUID(),
        role: 'user',
        content: text,
        toolCalls: [],
        timestamp,
      });
      continue;
    }

    if (record.type === 'assistant') {
      const payload = extractAssistantPayload(record.message);
      if (!payload.text && payload.toolCalls.length === 0) continue;

      model = payload.model ?? model;
      inputTokens += payload.inputTokens;
      outputTokens += payload.outputTokens;

      const previous = messages.at(-1);
      if (previous?.role === 'assistant') {
        messages[messages.length - 1] = {
          ...previous,
          content:
            previous.content && payload.text
              ? `${previous.content}\n\n${payload.text}`
              : previous.content || payload.text,
          toolCalls: [...previous.toolCalls, ...payload.toolCalls],
          timestamp,
        };
      } else {
        messages.push({
          id: typeof record.uuid === 'string' ? record.uuid : crypto.randomUUID(),
          role: 'assistant',
          content: payload.text,
          toolCalls: payload.toolCalls,
          timestamp,
        });
      }
    }
  }

  if (!messages.length) {
    return null;
  }

  const firstUserMessage = messages.find((message) => message.role === 'user');
  const name = truncateLabel(
    firstUserMessage?.content ||
      `Claude Session ${new Date(updatedAt).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`
  );

  return {
    claudeSessionId,
    name,
    cwd,
    model,
    messages,
    inputTokens,
    outputTokens,
    createdAt: Number.isFinite(createdAt) ? createdAt : updatedAt,
    updatedAt,
  };
}

function readClaudeHistoryForPath(folderPath: string): ImportedClaudeSession[] {
  const safePath = resolveProjectPath(folderPath);
  const projectDir = path.join(os.homedir(), '.claude', 'projects', encodeClaudeProjectPath(safePath));
  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(projectDir)
    .filter((fileName) => fileName.endsWith('.jsonl'))
    .map((fileName) => path.join(projectDir, fileName))
    .map((fullPath) => parseClaudeHistoryFile(fullPath))
    .filter((session): session is ImportedClaudeSession => session !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function readGitStatusForPath(folderPath: string): GitStatusSnapshot {
  const safePath = resolveProjectPath(folderPath);
  try {
    if (!fs.existsSync(safePath) || !fs.statSync(safePath).isDirectory()) {
      return {
        available: false,
        cwd: safePath,
        branch: null,
        dirty: false,
        ahead: 0,
        behind: 0,
      };
    }
  } catch {
    return {
      available: false,
      cwd: safePath,
      branch: null,
      dirty: false,
      ahead: 0,
      behind: 0,
    };
  }

  const probe = spawnSync('git', ['-C', safePath, 'status', '--porcelain=2', '--branch'], {
    encoding: 'utf8',
  });
  if (probe.status !== 0 || probe.error) {
    return {
      available: false,
      cwd: safePath,
      branch: null,
      dirty: false,
      ahead: 0,
      behind: 0,
    };
  }

  const output = typeof probe.stdout === 'string' ? probe.stdout : '';
  let branch: string | null = null;
  let dirty = false;
  let ahead = 0;
  let behind = 0;

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('# branch.head ')) {
      const value = line.replace('# branch.head ', '').trim();
      if (value && value !== '(detached)') {
        branch = value;
      } else if (value === '(detached)') {
        branch = 'detached';
      }
      continue;
    }

    if (line.startsWith('# branch.ab ')) {
      const match = line.match(/# branch\.ab \+(\d+) -(\d+)/);
      if (match) {
        ahead = Number.parseInt(match[1], 10) || 0;
        behind = Number.parseInt(match[2], 10) || 0;
      }
      continue;
    }

    if (!line.startsWith('#')) {
      dirty = true;
    }
  }

  return {
    available: true,
    cwd: safePath,
    branch,
    dirty,
    ahead,
    behind,
  };
}

function discoverClaudeProjects(): { id: string; path: string; name: string; sessionCount: number }[] {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  if (!fs.existsSync(projectsDir)) return [];

  return fs
    .readdirSync(projectsDir)
    .filter((encodedName) => {
      const fullPath = path.join(projectsDir, encodedName);
      return fs.statSync(fullPath).isDirectory();
    })
    .map((encodedName) => {
      // Decode: the encoded name is the original absolute path with non-alnum chars replaced by '-'
      // Try to find the actual directory by checking if a plausible path exists
      const projectDir = path.join(projectsDir, encodedName);
      const jsonlCount = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl')).length;
      if (jsonlCount === 0) return null;

      // Try to reconstruct the original path
      // Convention: path starts with /, segments separated by /
      // The encoded form is like -Users-simba-local-vibecoding-codeye
      // We try the direct approach: replace leading - with /, then try common separators
      const segments = encodedName.split('-').filter(Boolean);
      let resolvedPath = '';

      // Try building the path incrementally
      for (let i = 0; i < segments.length; i++) {
        const candidate = '/' + segments.slice(0, i + 1).join('/');
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
          resolvedPath = candidate;
        }
      }

      // If we couldn't find a valid directory, try joining all segments with _
      // Handle cases like local_vibecoding where _ was encoded as -
      if (!resolvedPath || resolvedPath === '/' + segments[0]) {
        // Brute-force: try each split point as / vs _ vs -
        resolvedPath = tryDecodePath(segments);
      }

      if (!resolvedPath || !fs.existsSync(resolvedPath)) return null;

      const folderName = path.basename(resolvedPath);
      return { id: encodedName, path: resolvedPath, name: folderName, sessionCount: jsonlCount };
    })
    .filter(Boolean) as { id: string; path: string; name: string; sessionCount: number }[];
}

function tryDecodePath(segments: string[]): string {
  // Try to reconstruct path by testing if directories exist
  // Start from root, greedily match the longest existing directory at each level
  let current = '';
  let i = 0;

  while (i < segments.length) {
    let bestMatch = '';
    let bestLen = 0;

    // Try joining consecutive segments with common separators (-, _, .)
    for (let j = i; j < segments.length; j++) {
      const part = segments.slice(i, j + 1).join('-');
      const candidates = [
        current + '/' + segments.slice(i, j + 1).join('/'),
        current + '/' + part,
        current + '/' + segments.slice(i, j + 1).join('_'),
        current + '/' + segments.slice(i, j + 1).join('.'),
      ];

      for (const candidate of candidates) {
        try {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
            if (j - i + 1 > bestLen) {
              bestMatch = candidate;
              bestLen = j - i + 1;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (bestLen === 0) {
      // No match found, append remaining as single segment
      current += '/' + segments[i];
      i++;
    } else {
      current = bestMatch;
      i += bestLen;
    }
  }

  return current;
}

interface BranchResult {
  success: boolean;
  branch: string;
  error?: string;
}

const BRANCH_NAME_RE = /^[a-zA-Z0-9._/-]{1,100}$/;

function isValidBranchName(name: string): boolean {
  return BRANCH_NAME_RE.test(name);
}

function listBranchesForPath(folderPath: string): string[] {
  const safePath = resolveProjectPath(folderPath);
  const result = spawnSync('git', ['-C', safePath, 'branch', '--list', '--format=%(refname:short)'], {
    encoding: 'utf8',
  });
  if (result.status !== 0 || result.error) return [];
  return (result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function createBranchForPath(folderPath: string, branchName: string): BranchResult {
  const safePath = resolveProjectPath(folderPath);
  const result = spawnSync('git', ['-C', safePath, 'checkout', '-b', branchName], {
    encoding: 'utf8',
  });
  if (result.status !== 0 || result.error) {
    const stderr = (result.stderr || '').trim();
    return { success: false, branch: branchName, error: stderr || 'Failed to create branch' };
  }
  return { success: true, branch: branchName };
}

function renameBranchForPath(folderPath: string, oldName: string, newName: string): BranchResult {
  const safePath = resolveProjectPath(folderPath);
  const result = spawnSync('git', ['-C', safePath, 'branch', '-m', oldName, newName], {
    encoding: 'utf8',
  });
  if (result.status !== 0 || result.error) {
    const stderr = (result.stderr || '').trim();
    return { success: false, branch: newName, error: stderr || 'Failed to rename branch' };
  }
  return { success: true, branch: newName };
}

function checkoutBranchForPath(folderPath: string, branchName: string): BranchResult {
  const safePath = resolveProjectPath(folderPath);
  const result = spawnSync('git', ['-C', safePath, 'checkout', branchName], {
    encoding: 'utf8',
  });
  if (result.status !== 0 || result.error) {
    const stderr = (result.stderr || '').trim();
    return { success: false, branch: branchName, error: stderr || 'Failed to checkout branch' };
  }
  return { success: true, branch: branchName };
}

export function registerProjectHandlers(ipcMain: IpcMain) {
  ipcMain.handle('projects:list', () => {
    return discoverClaudeProjects();
  });

  ipcMain.handle('projects:select-directory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Project Directory',
    });

    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('projects:import-claude-history', (_, folderPath: string) => {
    if (typeof folderPath !== 'string' || !folderPath.trim()) {
      return [];
    }

    return readClaudeHistoryForPath(folderPath);
  });

  ipcMain.handle('projects:get-git-status', (_, folderPath?: string) => {
    if (typeof folderPath !== 'string' || !folderPath.trim()) {
      return {
        available: false,
        cwd: '',
        branch: null,
        dirty: false,
        ahead: 0,
        behind: 0,
      } satisfies GitStatusSnapshot;
    }

    return readGitStatusForPath(folderPath);
  });

  ipcMain.handle('projects:list-branches', (_, folderPath: string) => {
    if (typeof folderPath !== 'string' || !folderPath.trim()) return [];
    return listBranchesForPath(folderPath);
  });

  ipcMain.handle('projects:create-branch', (_, folderPath: string, branchName: string) => {
    if (typeof folderPath !== 'string' || !folderPath.trim() || typeof branchName !== 'string' || !branchName.trim()) {
      return { success: false, branch: branchName || '', error: 'Invalid arguments' } satisfies BranchResult;
    }
    if (!isValidBranchName(branchName)) {
      return { success: false, branch: branchName, error: 'Invalid branch name' } satisfies BranchResult;
    }
    return createBranchForPath(folderPath, branchName);
  });

  ipcMain.handle('projects:checkout-branch', (_, folderPath: string, branchName: string) => {
    if (typeof folderPath !== 'string' || !folderPath.trim() || typeof branchName !== 'string' || !branchName.trim()) {
      return { success: false, branch: branchName || '', error: 'Invalid arguments' } satisfies BranchResult;
    }
    if (!isValidBranchName(branchName)) {
      return { success: false, branch: branchName, error: 'Invalid branch name' } satisfies BranchResult;
    }
    return checkoutBranchForPath(folderPath, branchName);
  });

  ipcMain.handle('projects:rename-branch', (_, folderPath: string, oldName: string, newName: string) => {
    if (typeof folderPath !== 'string' || !folderPath.trim() || typeof oldName !== 'string' || !oldName.trim() || typeof newName !== 'string' || !newName.trim()) {
      return { success: false, branch: newName || '', error: 'Invalid arguments' } satisfies BranchResult;
    }
    if (!isValidBranchName(oldName) || !isValidBranchName(newName)) {
      return { success: false, branch: newName, error: 'Invalid branch name' } satisfies BranchResult;
    }
    return renameBranchForPath(folderPath, oldName, newName);
  });

  ipcMain.handle('projects:watch-history', (_, folderPath: string, encodedPath: string) => {
    if (typeof folderPath !== 'string' || typeof encodedPath !== 'string') return;
    watchProjectHistory(folderPath, encodedPath);
  });

  ipcMain.handle('projects:unwatch-history', (_, encodedPath: string) => {
    if (typeof encodedPath !== 'string') return;
    unwatchProjectHistory(encodedPath);
  });

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}
