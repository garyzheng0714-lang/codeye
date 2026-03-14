import { WebSocket } from 'ws';
import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { SESSION_ID_RE, type QueryMessage } from './validators';
import { wrapEvent } from './streamEvent';

const MAX_PROMPT_LEN = 32_000;
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

function supportsEffort(model?: string): boolean {
  if (!model) return true;
  const normalized = model.toLowerCase();
  return !(normalized === 'haiku' || normalized.startsWith('claude-haiku-'));
}

function resolvePermissionMode(
  requestedPermissionMode?: string,
  mode?: string
): string | undefined {
  if (typeof requestedPermissionMode === 'string') {
    const normalized = requestedPermissionMode.trim();
    const mapped = normalized === 'full-access' ? 'bypassPermissions' : normalized;
    if (ALLOWED_PERMISSION_MODES.has(mapped)) {
      return mapped;
    }
  }

  if (mode === 'plan') {
    return 'plan';
  }

  return undefined;
}

export const clientProcesses = new Map<WebSocket, ChildProcess>();

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

export function handleCheckAuth(ws: WebSocket, isNested: boolean) {
  if (isNested) {
    ws.send(wrapEvent('auth', { authenticated: true, method: 'demo' }));
    return;
  }
  try {
    execSync('which claude', { stdio: 'pipe' });
    ws.send(wrapEvent('auth', { authenticated: true, method: 'cli' }));
  } catch {
    ws.send(wrapEvent('auth', {
      authenticated: false,
      error: 'Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code',
    }));
  }
}

export function handleRealQuery(ws: WebSocket, msg: QueryMessage) {
  const existing = clientProcesses.get(ws);
  if (existing) {
    existing.kill('SIGTERM');
    clientProcesses.delete(ws);
  }

  const prompt = msg.prompt.slice(0, MAX_PROMPT_LEN);
  const args = ['-p', '--output-format', 'stream-json', '--verbose'];

  if (msg.model && typeof msg.model === 'string' && ALLOWED_MODELS.has(msg.model)) {
    args.push('--model', msg.model);
  }

  if (
    msg.effort &&
    typeof msg.effort === 'string' &&
    ALLOWED_EFFORTS.has(msg.effort) &&
    supportsEffort(msg.model)
  ) {
    args.push('--effort', msg.effort);
  }

  const permissionMode = resolvePermissionMode(msg.permissionMode, msg.mode);
  if (permissionMode && permissionMode !== 'default') {
    args.push('--permission-mode', permissionMode);
  }

  if (msg.sessionId && typeof msg.sessionId === 'string' && SESSION_ID_RE.test(msg.sessionId)) {
    args.push('--resume', msg.sessionId);
  }

  args.push(prompt);

  const childProcess = spawn('claude', args, {
    cwd: safeCwd(msg.cwd),
    env: getCleanEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  clientProcesses.set(ws, childProcess);

  let buffer = '';
  let stderrBuffer = '';

  childProcess.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(wrapEvent('message', { data: parsed }));
        }
      } catch {
        // partial JSON, accumulate
      }
    }
  });

  childProcess.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuffer += text;
    process.stderr.write(`[claude-cli] ${text}`);
  });

  childProcess.on('close', (code, signal) => {
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(wrapEvent('message', { data: parsed }));
        }
      } catch {
        // ignore
      }
    }
    clientProcesses.delete(ws);

    const stoppedByUser = signal === 'SIGTERM' || signal === 'SIGINT';
    const success = code === 0 || stoppedByUser;
    if (!success && ws.readyState === WebSocket.OPEN) {
      const stderrText = stderrBuffer.trim();
      const fallback = typeof code === 'number'
        ? `Claude CLI exited with code ${code}.`
        : 'Claude CLI exited unexpectedly.';
      ws.send(wrapEvent('error', { error: stderrText || fallback }));
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(wrapEvent('complete', {}));
    }
  });

  childProcess.on('error', (err) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(wrapEvent('error', { error: err.message }));
    }
    clientProcesses.delete(ws);
  });
}
