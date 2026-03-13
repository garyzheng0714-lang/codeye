import { WebSocketServer, WebSocket } from 'ws';
import { spawn, execSync, ChildProcess } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';

const PORT = 5174;
const IS_NESTED = !!process.env.CLAUDECODE;
const MAX_PROMPT_LEN = 32_000;

const server = http.createServer();
const wss = new WebSocketServer({ server });

const clientProcesses = new Map<WebSocket, ChildProcess>();

const ALLOWED_MODELS = new Set([
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
]);

interface QueryMessage {
  type: 'query';
  prompt: string;
  cwd?: string;
  mode?: string;
  model?: string;
  sessionId?: string;
}

function isQueryMessage(msg: unknown): msg is QueryMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>).type === 'query' &&
    typeof (msg as Record<string, unknown>).prompt === 'string'
  );
}

function isStopMessage(msg: unknown): msg is { type: 'stop' } {
  return typeof msg === 'object' && msg !== null && (msg as Record<string, unknown>).type === 'stop';
}

function isCheckAuthMessage(msg: unknown): msg is { type: 'check-auth' } {
  return typeof msg === 'object' && msg !== null && (msg as Record<string, unknown>).type === 'check-auth';
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

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: Buffer) => {
    try {
      const msg: unknown = JSON.parse(data.toString());

      if (isQueryMessage(msg)) {
        if (IS_NESTED) {
          handleDemoQuery(ws, msg);
        } else {
          handleRealQuery(ws, msg);
        }
      } else if (isStopMessage(msg)) {
        const proc = clientProcesses.get(ws);
        if (proc) {
          proc.kill('SIGTERM');
          clientProcesses.delete(ws);
        }
        ws.send(JSON.stringify({ type: 'complete' }));
      } else if (isCheckAuthMessage(msg)) {
        handleCheckAuth(ws);
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', error: String(err) }));
    }
  });

  ws.on('close', () => {
    const proc = clientProcesses.get(ws);
    if (proc) {
      proc.kill('SIGTERM');
      clientProcesses.delete(ws);
    }
  });
});

// ============================================================
// Demo mode
// ============================================================
function handleDemoQuery(ws: WebSocket, msg: QueryMessage) {
  const sessionId = `demo-${Date.now()}`;

  ws.send(JSON.stringify({
    type: 'message',
    data: { type: 'system', subtype: 'init', session_id: sessionId },
  }));

  const toolCallId = `tool-${Date.now()}`;
  ws.send(JSON.stringify({
    type: 'message',
    data: {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{
          type: 'tool_use',
          tool_use_id: toolCallId,
          name: 'Read',
          input: { file_path: 'src/App.tsx' },
        }],
      },
    },
  }));

  const response = generateDemoResponse(msg.prompt, msg.model);
  const words = response.split(' ');
  let i = 0;

  const interval = setInterval(() => {
    if (i >= words.length) {
      clearInterval(interval);
      ws.send(JSON.stringify({
        type: 'message',
        data: {
          type: 'result',
          cost_usd: 0.0042,
          input_tokens: 150,
          output_tokens: words.length * 2,
          duration_ms: words.length * 50,
        },
      }));
      ws.send(JSON.stringify({ type: 'complete' }));
      return;
    }

    const chunk = words.slice(i, i + 3).join(' ') + ' ';
    ws.send(JSON.stringify({
      type: 'message',
      data: {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: chunk }],
        },
      },
    }));
    i += 3;
  }, 80);
}

function getModelDisplayName(model?: string): string {
  if (model === 'claude-opus-4-6') return 'Claude Opus 4.6';
  if (model === 'claude-haiku-4-5') return 'Claude Haiku 4.5';
  return 'Claude Sonnet 4.6';
}

function generateDemoResponse(prompt: string, model?: string): string {
  const lower = prompt.toLowerCase();
  const modelName = getModelDisplayName(model);

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `Hello! I'm **${modelName}**, running inside **EasyCode**. This is a demo response to show how the chat interface works.\n\nHere's what I can do:\n\n- **Read** and analyze your code\n- **Write** new files\n- **Edit** existing code\n- Run **terminal commands**\n\nWhat would you like to build today?`;
  }

  if (lower.includes('bug') || lower.includes('fix')) {
    return `I'll help you find and fix bugs. Let me analyze the codebase.\n\nI found a potential issue:\n\n\`\`\`typescript\n// Before\nif (!token) {\n  return false;\n}\n\n// After\nif (!token || isTokenExpired(token)) {\n  return false;\n}\n\`\`\`\n\nThe original code didn't validate token expiry.`;
  }

  if (lower.includes('refactor') || lower.includes('performance')) {
    return `Let me analyze the code for performance improvements.\n\n### Recommendations\n\n1. **Memoize expensive computations**\n2. **Use virtual scrolling** for large lists\n3. **Lazy load routes**\n\n\`\`\`typescript\nconst Dashboard = React.lazy(() => import('./pages/Dashboard'));\nconst Settings = React.lazy(() => import('./pages/Settings'));\n\`\`\`\n\nWant me to implement any of these?`;
  }

  return `I received your message.\n\nThis is a **demo response** from EasyCode. In production, this would be a real response from Claude.\n\n\`\`\`python\ndef hello():\n    print("Hello from EasyCode!")\n    return 42\n\`\`\`\n\n> This demo mode activates automatically when running inside a Claude Code session.`;
}

// ============================================================
// Real mode
// ============================================================
function handleCheckAuth(ws: WebSocket) {
  if (IS_NESTED) {
    ws.send(JSON.stringify({ type: 'auth', authenticated: true, method: 'demo' }));
    return;
  }
  try {
    execSync('which claude', { stdio: 'pipe' });
    ws.send(JSON.stringify({ type: 'auth', authenticated: true, method: 'cli' }));
  } catch {
    ws.send(JSON.stringify({
      type: 'auth',
      authenticated: false,
      error: 'Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code',
    }));
  }
}

function getCleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const keysToRemove = Object.keys(env).filter(
    (k) => k.startsWith('CLAUDE') || k.startsWith('ANTHROPIC_CLAUDE_CODE')
  );
  for (const key of keysToRemove) {
    delete env[key];
  }
  return env;
}

function handleRealQuery(ws: WebSocket, msg: QueryMessage) {
  const existing = clientProcesses.get(ws);
  if (existing) {
    existing.kill('SIGTERM');
    clientProcesses.delete(ws);
  }

  const prompt = msg.prompt.slice(0, MAX_PROMPT_LEN);
  const args = ['-p', '--output-format', 'stream-json'];

  if (msg.model && typeof msg.model === 'string' && ALLOWED_MODELS.has(msg.model)) {
    args.push('--model', msg.model);
  }

  if (msg.sessionId && typeof msg.sessionId === 'string') {
    args.push('--resume', msg.sessionId);
  }

  args.push(prompt);

  const childProcess = spawn('claude', args, {
    cwd: safeCwd(msg.cwd),
    env: getCleanEnv(),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  clientProcesses.set(ws, childProcess);

  let buffer = '';

  childProcess.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        ws.send(JSON.stringify({ type: 'message', data: parsed }));
      } catch {
        // partial JSON, accumulate
      }
    }
  });

  childProcess.stderr?.on('data', (_chunk: Buffer) => {
    // stderr silently consumed
  });

  childProcess.on('close', (_code) => {
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        ws.send(JSON.stringify({ type: 'message', data: parsed }));
      } catch {
        // ignore
      }
    }
    clientProcesses.delete(ws);
    ws.send(JSON.stringify({ type: 'complete' }));
  });

  childProcess.on('error', (err) => {
    ws.send(JSON.stringify({ type: 'error', error: err.message }));
    clientProcesses.delete(ws);
  });
}

server.listen(PORT, '127.0.0.1', () => {
  // Server bound to loopback only
});
