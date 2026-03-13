import { IpcMain, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const MAX_PROMPT_LEN = 32_000;
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const ALLOWED_MODES = new Set(['chat', 'code', 'plan']);

let currentProcess: ChildProcess | null = null;

const MODE_TOOLS: Record<string, string[]> = {
  chat: ['Read', 'Glob', 'Grep', 'WebSearch'],
  code: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
  plan: ['Read', 'Glob', 'Grep'],
};

function safeCwd(requestedCwd?: string): string {
  if (!requestedCwd) return process.cwd();
  const resolved = path.resolve(requestedCwd);
  try {
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return process.cwd();
    }
  } catch {
    return process.cwd();
  }
  return resolved;
}

function checkClaudeAuth(): { authenticated: boolean; method?: string; error?: string } {
  if (process.env.ANTHROPIC_API_KEY) {
    return { authenticated: true, method: 'api-key' };
  }

  const credentialsPath = path.join(os.homedir(), '.claude', '.credentials.json');
  if (fs.existsSync(credentialsPath)) {
    return { authenticated: true, method: 'cli-login' };
  }

  const claudeDir = path.join(os.homedir(), '.claude');
  if (fs.existsSync(claudeDir)) {
    return { authenticated: true, method: 'cli-config' };
  }

  return { authenticated: false, error: 'No authentication found. Set ANTHROPIC_API_KEY or run "claude login" in terminal.' };
}

export function registerClaudeHandlers(ipcMain: IpcMain) {
  ipcMain.handle('claude:check-auth', () => checkClaudeAuth());

  ipcMain.handle('claude:query', async (event, { prompt, sessionId, cwd, mode = 'code' }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;

    const safePrompt = typeof prompt === 'string' ? prompt.slice(0, MAX_PROMPT_LEN) : '';
    if (!safePrompt) return;

    const safeMode = typeof mode === 'string' && ALLOWED_MODES.has(mode) ? mode : 'code';

    const args = ['--print', '--output-format', 'stream-json'];

    if (sessionId && typeof sessionId === 'string' && SESSION_ID_RE.test(sessionId)) {
      args.push('--resume', sessionId);
    }

    const allowedTools = MODE_TOOLS[safeMode] || MODE_TOOLS.code;
    for (const tool of allowedTools) {
      args.push('--allowedTools', tool);
    }

    if (safeMode === 'plan') {
      args.push('--system-prompt', 'You are in planning mode. Analyze and plan only. Do NOT modify any files.');
    }

    args.push(safePrompt);

    currentProcess = spawn('claude', args, {
      cwd: safeCwd(cwd),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buffer = '';

    currentProcess.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line);
          win.webContents.send('claude:message', message);
        } catch {
          // partial JSON, will be handled next chunk
        }
      }
    });

    currentProcess.stderr?.on('data', (data: Buffer) => {
      const errText = data.toString();
      if (errText.includes('error') || errText.includes('Error')) {
        win.webContents.send('claude:error', errText);
      }
    });

    currentProcess.on('close', () => {
      currentProcess = null;
      win.webContents.send('claude:complete');
    });

    currentProcess.on('error', (err) => {
      win.webContents.send('claude:error', err.message);
      currentProcess = null;
    });
  });

  ipcMain.handle('claude:stop', () => {
    if (currentProcess) {
      currentProcess.kill('SIGTERM');
      currentProcess = null;
    }
  });
}
