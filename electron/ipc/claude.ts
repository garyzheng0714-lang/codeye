import { IpcMain, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const MAX_PROMPT_LEN = 32_000;
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const ALLOWED_MODES = new Set(['chat', 'code', 'plan']);
const ALLOWED_MODELS = new Set(['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5']);
const ALLOWED_EFFORTS = new Set(['low', 'medium', 'high', 'max']);

let currentProcess: ChildProcess | null = null;

/**
 * Build a clean env for spawning claude CLI.
 * - Strips CLAUDE* / ANTHROPIC_CLAUDE_CODE* to avoid nested-session detection
 * - Disables color output to keep stdout pure JSON
 * Pattern from: claude-ui (cacdcaecawae/claude-ui)
 */
function getCleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const keysToRemove = Object.keys(env).filter(
    (k) => k.startsWith('CLAUDE') || k.startsWith('ANTHROPIC_CLAUDE_CODE')
  );
  for (const key of keysToRemove) {
    delete env[key];
  }
  env.FORCE_COLOR = '0';
  env.NO_COLOR = '1';
  return env;
}

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

  ipcMain.handle('claude:query', async (event, { prompt, sessionId, cwd, mode = 'code', model, effort }) => {
    console.log('[claude:query] received:', { prompt: prompt?.slice(0, 50), sessionId, cwd, mode, model, effort });
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) { console.log('[claude:query] no window found'); return; }

    if (currentProcess) {
      currentProcess.kill('SIGTERM');
      currentProcess = null;
    }

    const safePrompt = typeof prompt === 'string' ? prompt.slice(0, MAX_PROMPT_LEN) : '';
    if (!safePrompt) return;

    const safeMode = typeof mode === 'string' && ALLOWED_MODES.has(mode) ? mode : 'code';

    // -p = print mode (non-interactive)
    // --output-format stream-json requires --verbose
    // message goes last as positional argument
    const args = ['-p', '--output-format', 'stream-json', '--verbose'];

    if (sessionId && typeof sessionId === 'string' && SESSION_ID_RE.test(sessionId)) {
      args.push('--resume', sessionId);
    }

    if (model && typeof model === 'string' && ALLOWED_MODELS.has(model)) {
      args.push('--model', model);
    }

    if (effort && typeof effort === 'string' && ALLOWED_EFFORTS.has(effort)) {
      args.push('--effort', effort);
    }

    if (safeMode === 'plan') {
      args.push('--permission-mode', 'plan');
    }

    args.push(safePrompt);

    console.log('[claude:query] spawning:', 'claude', args.join(' '));
    currentProcess = spawn('claude', args, {
      cwd: safeCwd(cwd),
      env: getCleanEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
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
      console.log('[claude:stderr]', errText);
      if (errText.includes('error') || errText.includes('Error')) {
        win.webContents.send('claude:error', errText);
      }
    });

    currentProcess.on('close', () => {
      if (buffer.trim()) {
        try {
          const message = JSON.parse(buffer);
          win.webContents.send('claude:message', message);
        } catch {
          // ignore
        }
      }
      currentProcess = null;
      win.webContents.send('claude:complete');
    });

    currentProcess.on('error', (err) => {
      console.log('[claude:error]', err.message);
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
