import { IpcMain, BrowserWindow } from 'electron';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const MAX_PROMPT_LEN = 32_000;
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const ALLOWED_MODES = new Set(['chat', 'code', 'plan']);
const ALLOWED_MODELS = new Set([
  'opus',
  'sonnet',
  'haiku',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
]);
const ALLOWED_EFFORTS = new Set(['low', 'medium', 'high']);
const CLAUDE_CLI_NOT_FOUND_MESSAGE =
  'Claude CLI executable not found. Install with "npm i -g @anthropic-ai/claude-code", or set CLAUDE_PATH to the absolute binary path.';
const COMMON_CLAUDE_PATHS = [
  '/opt/homebrew/bin/claude',
  '/usr/local/bin/claude',
  path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
  path.join(os.homedir(), '.local', 'bin', 'claude'),
];
let cachedClaudeBinary: string | null = null;

function supportsEffort(model?: string): boolean {
  if (!model) return true;
  const normalized = model.toLowerCase();
  return !(normalized === 'haiku' || normalized.startsWith('claude-haiku-'));
}

function isExecutableFile(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveFromLoginShell(shellPath: string): string | null {
  const probe = spawnSync(shellPath, ['-lc', 'command -v claude'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (probe.status !== 0) return null;
  const output = typeof probe.stdout === 'string' ? probe.stdout.trim() : '';
  if (!output || !isExecutableFile(output)) return null;
  return output;
}

function resolveClaudeBinary(): string | null {
  if (cachedClaudeBinary && isExecutableFile(cachedClaudeBinary)) {
    return cachedClaudeBinary;
  }

  const envPath = process.env.CLAUDE_PATH;
  if (envPath && isExecutableFile(envPath)) {
    cachedClaudeBinary = envPath;
    return envPath;
  }

  for (const shellPath of ['/bin/zsh', '/bin/bash']) {
    if (!fs.existsSync(shellPath)) continue;
    const fromShell = resolveFromLoginShell(shellPath);
    if (fromShell) {
      cachedClaudeBinary = fromShell;
      return fromShell;
    }
  }

  for (const candidate of COMMON_CLAUDE_PATHS) {
    if (isExecutableFile(candidate)) {
      cachedClaudeBinary = candidate;
      return candidate;
    }
  }

  // nvm installations: ~/.nvm/versions/node/*/bin/claude
  const nvmNodeRoot = path.join(os.homedir(), '.nvm', 'versions', 'node');
  if (fs.existsSync(nvmNodeRoot)) {
    const versions = fs.readdirSync(nvmNodeRoot).sort().reverse();
    for (const version of versions) {
      const nvmCandidate = path.join(nvmNodeRoot, version, 'bin', 'claude');
      if (isExecutableFile(nvmCandidate)) {
        cachedClaudeBinary = nvmCandidate;
        return nvmCandidate;
      }
    }
  }

  const pathProbe = spawnSync('claude', ['--version'], { stdio: 'ignore' });
  if (!pathProbe.error) {
    return 'claude';
  }

  return null;
}

// Per-pane process management: 'primary' uses legacy events, others use pane-specific events
const activeProcesses = new Map<string, ChildProcess>();

function getEventChannels(paneId: string) {
  if (paneId === 'primary') {
    return { msg: 'claude:message', complete: 'claude:complete', error: 'claude:error' };
  }
  return {
    msg: `claude:message:${paneId}`,
    complete: `claude:complete:${paneId}`,
    error: `claude:error:${paneId}`,
  };
}

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
  const claudeBinary = resolveClaudeBinary();
  if (!claudeBinary) {
    return {
      authenticated: false,
      error: CLAUDE_CLI_NOT_FOUND_MESSAGE,
    };
  }

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

  return {
    authenticated: false,
    error: `Claude CLI found at "${claudeBinary}", but no authentication was detected. Run "claude login" in terminal.`,
  };
}

export function registerClaudeHandlers(ipcMain: IpcMain) {
  ipcMain.handle('claude:check-auth', () => checkClaudeAuth());

  ipcMain.handle('claude:query', async (event, { prompt, sessionId, cwd, mode = 'code', model, effort, paneId }) => {
    const safePaneId = typeof paneId === 'string' && paneId.length > 0 ? paneId : 'primary';
    console.log('[claude:query] received:', { prompt: prompt?.slice(0, 50), sessionId, cwd, mode, model, effort, paneId: safePaneId });
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) { console.log('[claude:query] no window found'); return; }

    const existing = activeProcesses.get(safePaneId);
    if (existing) {
      existing.kill('SIGTERM');
      activeProcesses.delete(safePaneId);
    }
    const channels = getEventChannels(safePaneId);

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

    if (
      effort &&
      typeof effort === 'string' &&
      ALLOWED_EFFORTS.has(effort) &&
      supportsEffort(model)
    ) {
      args.push('--effort', effort);
    }

    if (safeMode === 'plan') {
      args.push('--permission-mode', 'plan');
    }

    args.push(safePrompt);

    const claudeBinary = resolveClaudeBinary();
    if (!claudeBinary) {
      win.webContents.send(channels.error, CLAUDE_CLI_NOT_FOUND_MESSAGE);
      return;
    }

    console.log('[claude:query] spawning:', claudeBinary, args.join(' '));
    const proc = spawn(claudeBinary, args, {
      cwd: safeCwd(cwd),
      env: getCleanEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    activeProcesses.set(safePaneId, proc);

    let buffer = '';
    let stderrBuffer = '';

    proc.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line);
          win.webContents.send(channels.msg, message);
        } catch {
          // partial JSON, will be handled next chunk
        }
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const errText = data.toString();
      stderrBuffer += errText;
      console.log('[claude:stderr]', errText);
    });

    proc.on('close', (code, signal) => {
      if (buffer.trim()) {
        try {
          const message = JSON.parse(buffer);
          win.webContents.send(channels.msg, message);
        } catch {
          // ignore
        }
      }
      activeProcesses.delete(safePaneId);

      const stoppedByUser = signal === 'SIGTERM' || signal === 'SIGINT';
      const success = code === 0 || stoppedByUser;
      if (!success) {
        const stderrText = stderrBuffer.trim();
        const fallback = typeof code === 'number'
          ? `Claude CLI exited with code ${code}.`
          : 'Claude CLI exited unexpectedly.';
        win.webContents.send(channels.error, stderrText || fallback);
      }

      win.webContents.send(channels.complete);
    });

    proc.on('error', (err) => {
      const maybeErr = err as NodeJS.ErrnoException;
      const errorMessage = maybeErr.code === 'ENOENT'
        ? CLAUDE_CLI_NOT_FOUND_MESSAGE
        : err.message;
      console.log('[claude:error]', errorMessage);
      win.webContents.send(channels.error, errorMessage);
      activeProcesses.delete(safePaneId);
    });
  });

  ipcMain.handle('claude:stop', (_, paneId?: string) => {
    const safePaneId = typeof paneId === 'string' && paneId.length > 0 ? paneId : 'primary';
    const proc = activeProcesses.get(safePaneId);
    if (proc) {
      proc.kill('SIGTERM');
      activeProcesses.delete(safePaneId);
    }
  });
}
