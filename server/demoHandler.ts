import { WebSocket } from 'ws';
import type { QueryMessage } from './validators';
import { wrapEvent } from './streamEvent';

function getModelDisplayName(model?: string): string {
  if (model === 'claude-opus-4-6') return 'Claude Opus 4.6';
  if (model === 'claude-haiku-4-5') return 'Claude Haiku 4.5';
  return 'Claude Sonnet 4.6';
}

function generateDemoResponse(prompt: string, model?: string): string {
  const lower = prompt.toLowerCase();
  const modelName = getModelDisplayName(model);

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `Hello! I'm **${modelName}**, running inside **Codeye**. This is a demo response.\n\nHere's what I can do:\n\n- **Read** and analyze your code\n- **Write** new files\n- **Edit** existing code\n- Run **terminal commands**\n\nWhat would you like to build today?`;
  }

  if (lower.includes('bug') || lower.includes('fix')) {
    return `I'll help you find and fix bugs. Let me analyze the codebase.\n\nI found a potential issue:\n\n\`\`\`typescript\n// Before\nif (!token) {\n  return false;\n}\n\n// After\nif (!token || isTokenExpired(token)) {\n  return false;\n}\n\`\`\`\n\nThe original code didn't validate token expiry.`;
  }

  if (lower.includes('refactor') || lower.includes('performance')) {
    return `Let me analyze the code for performance improvements.\n\n### Recommendations\n\n1. **Memoize expensive computations**\n2. **Use virtual scrolling** for large lists\n3. **Lazy load routes**\n\n\`\`\`typescript\nconst Dashboard = React.lazy(() => import('./pages/Dashboard'));\nconst Settings = React.lazy(() => import('./pages/Settings'));\n\`\`\`\n\nWant me to implement any of these?`;
  }

  return `I received your message.\n\nThis is a **demo response** from **Codeye**. In production, this would be a real response from Claude.\n\n\`\`\`python\ndef hello():\n    print("Hello from Codeye!")\n    return 42\n\`\`\`\n\n> Demo mode is active because Codeye is running inside a Claude Code session.`;
}

export function handleDemoQuery(ws: WebSocket, msg: QueryMessage) {
  const sessionId = `demo-${Date.now()}`;

  ws.send(wrapEvent('message', {
    data: { type: 'system', subtype: 'init', session_id: sessionId },
  }));

  const toolCallId = `tool-${Date.now()}`;
  ws.send(wrapEvent('message', {
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
      ws.send(wrapEvent('message', {
        data: {
          type: 'result',
          cost_usd: 0.0042,
          input_tokens: 150,
          output_tokens: words.length * 2,
          duration_ms: words.length * 50,
        },
      }));
      ws.send(wrapEvent('complete', {}));
      return;
    }

    const chunk = words.slice(i, i + 3).join(' ') + ' ';
    ws.send(wrapEvent('message', {
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
