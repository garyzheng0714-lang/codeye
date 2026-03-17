import { IpcMain, BrowserWindow } from 'electron';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const MAX_PROMPT_LEN = 32_000;
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
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
const ALLOWED_PERMISSION_MODES = new Set([
  'default',
  'plan',
  'auto',
  'dontAsk',
  'acceptEdits',
  'bypassPermissions',
]);
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

function resolvePermissionMode(
  requestedPermissionMode: unknown,
  safeMode: string
): string | undefined {
  if (typeof requestedPermissionMode === 'string') {
    const normalized = requestedPermissionMode.trim();
    const mapped = normalized === 'full-access' ? 'bypassPermissions' : normalized;
    if (ALLOWED_PERMISSION_MODES.has(mapped)) {
      return mapped;
    }
  }

  if (safeMode === 'plan') {
    return 'plan';
  }

  return undefined;
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

function sanitizeAttachmentName(raw: string, index: number): string {
  const fallback = `attachment-${Date.now()}-${index + 1}.bin`;
  const base = raw.trim() || fallback;
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (safe.startsWith('.')) return `file${safe}`;
  return safe;
}

function decodeBase64Payload(input: string): Buffer | null {
  if (!input || typeof input !== 'string') return null;
  const normalized = input.includes(',') ? input.split(',').at(-1) ?? '' : input;
  if (!normalized) return null;
  try {
    return Buffer.from(normalized, 'base64');
  } catch {
    return null;
  }
}

function persistAttachments(
  attachments: unknown,
  cwd: string
): string[] {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];
  const dir = path.join(cwd, '.codeye', 'attachments');
  fs.mkdirSync(dir, { recursive: true });
  const saved: string[] = [];

  attachments.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const attachment = entry as { name?: unknown; dataBase64?: unknown };
    const name = sanitizeAttachmentName(typeof attachment.name === 'string' ? attachment.name : '', index);
    const payload = decodeBase64Payload(
      typeof attachment.dataBase64 === 'string' ? attachment.dataBase64 : ''
    );
    if (!payload || payload.length === 0 || payload.length > MAX_ATTACHMENT_BYTES) return;
    const unique = `${Date.now()}-${index + 1}-${name}`;
    const filePath = path.join(dir, unique);
    fs.writeFileSync(filePath, payload);
    saved.push(filePath);
  });

  return saved;
}

function buildPromptWithAttachments(prompt: string, attachmentPaths: string[]): string {
  if (attachmentPaths.length === 0) return prompt;
  const lines = attachmentPaths.map((filePath) => `#file ${filePath}`);
  return `${prompt}\n\nUse these attachments as context before answering:\n${lines.join('\n')}`;
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

  ipcMain.handle('claude:query', async (event, {
    prompt,
    sessionId,
    cwd,
    mode = 'code',
    model,
    effort,
    permissionMode,
    attachments,
    paneId,
  }) => {
    const safePaneId = typeof paneId === 'string' && paneId.length > 0 ? paneId : 'primary';
    console.log('[claude:query] received:', {
      prompt: prompt?.slice(0, 50),
      sessionId,
      cwd,
      mode,
      model,
      effort,
      permissionMode,
      attachmentCount: Array.isArray(attachments) ? attachments.length : 0,
      paneId: safePaneId,
    });
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) { console.log('[claude:query] no window found'); return; }

    const existing = activeProcesses.get(safePaneId);
    if (existing) {
      existing.kill('SIGTERM');
      activeProcesses.delete(safePaneId);
    }
    const channels = getEventChannels(safePaneId);

    const safeWorkingDir = safeCwd(cwd);
    const attachmentPaths = persistAttachments(attachments, safeWorkingDir);
    const safePrompt = typeof prompt === 'string'
      ? buildPromptWithAttachments(prompt, attachmentPaths).slice(0, MAX_PROMPT_LEN)
      : '';
    if (!safePrompt) return;

    const safeMode = typeof mode === 'string' && ALLOWED_MODES.has(mode) ? mode : 'code';
    const safePermissionMode = resolvePermissionMode(permissionMode, safeMode);

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

    if (safePermissionMode && safePermissionMode !== 'default') {
      args.push('--permission-mode', safePermissionMode);
    }

    args.push(safePrompt);

    const claudeBinary = resolveClaudeBinary();
    if (!claudeBinary) {
      win.webContents.send(channels.error, CLAUDE_CLI_NOT_FOUND_MESSAGE);
      return;
    }

    console.log('[claude:query] spawning:', claudeBinary, args.join(' '));
    const proc = spawn(claudeBinary, args, {
      cwd: safeWorkingDir,
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

  ipcMain.handle('claude:generateTitle', async (_, message: string): Promise<string | null> => {
    const claudeBinary = resolveClaudeBinary();
    if (!claudeBinary) return null;

    const safeMessage = String(message).slice(0, 200).replace(/"/g, '\\"');
    const prompt = `用6个中文字以内概括这句话的主题，只输出标题，不要引号不要标点：${safeMessage}`;

    return new Promise((resolve) => {
      const proc = spawn(claudeBinary, ['-p', '--model', 'haiku', prompt], {
        stdio: ['ignore', 'pipe', 'ignore'],
        env: { ...process.env, TERM: 'dumb' },
        timeout: 10000,
      });

      let output = '';
      proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
      proc.on('close', () => {
        const title = output.trim().replace(/["""''「」『』]/g, '').slice(0, 20);
        resolve(title || null);
      });
      proc.on('error', () => resolve(null));
    });
  });
}
