import { IpcMain, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

let currentProcess: ChildProcess | null = null;

const MODE_TOOLS: Record<string, string[]> = {
  chat: ['Read', 'Glob', 'Grep', 'WebSearch'],
  code: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
  plan: ['Read', 'Glob', 'Grep'],
};

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

    const args = ['--print', '--output-format', 'stream-json'];

    if (sessionId) {
      args.push('--resume', sessionId);
    }

    const allowedTools = MODE_TOOLS[mode] || MODE_TOOLS.code;
    for (const tool of allowedTools) {
      args.push('--allowedTools', tool);
    }

    if (mode === 'plan') {
      args.push('--system-prompt', 'You are in planning mode. Analyze and plan only. Do NOT modify any files.');
    }

    args.push(prompt);

    currentProcess = spawn('claude', args, {
      cwd: cwd || process.cwd(),
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
