import { IpcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

function resolveProjectPath(folderPath: string): string {
  const resolved = path.resolve(folderPath);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function encodeClaudeProjectPath(folderPath: string): string {
  return resolveProjectPath(folderPath).replace(/[\\/]/g, '-');
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

export function registerProjectHandlers(ipcMain: IpcMain) {
  ipcMain.handle('projects:list', () => {
    const projectsDir = path.join(os.homedir(), '.claude', 'projects');
    if (!fs.existsSync(projectsDir)) return [];

    return fs
      .readdirSync(projectsDir)
      .filter((name) => {
        const fullPath = path.join(projectsDir, name);
        return fs.statSync(fullPath).isDirectory();
      })
      .map((name) => ({
        id: name,
        path: name.replace(/-/g, '/'),
        name: name.split('-').filter(Boolean).pop() || name,
      }));
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
