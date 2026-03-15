import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import {
  isQueryMessage,
  isStopMessage,
  isCheckAuthMessage,
  parseClientRequestEvent,
  validateGitRequestEvent,
} from './validators';
import { handleRealQuery, handleCheckAuth, clientProcesses } from './realHandler';
import { wrapEvent } from './streamEvent';
import { getServerFeatureFlagDocument } from './featureFlags';
import { getGitStatusSnapshot } from './gitHandler';

const PORT = 5174;
const wsWorkspaceRootByConnection = new WeakMap<WebSocket, string>();

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:5180', 'http://127.0.0.1:5180'];
  if (origin && !allowedOrigins.includes(origin)) {
    ws.close(1008, 'Forbidden origin');
    return;
  }

  ws.send(wrapEvent('feature_flags', getServerFeatureFlagDocument()));

  ws.on('message', (data: Buffer) => {
    try {
      const msg: unknown = JSON.parse(data.toString());

      if (isQueryMessage(msg)) {
        handleRealQuery(ws, msg);
      } else if (isStopMessage(msg)) {
        const proc = clientProcesses.get(ws);
        if (proc) {
          proc.kill('SIGTERM');
          clientProcesses.delete(ws);
        }
        ws.send(wrapEvent('complete', {}));
      } else if (isCheckAuthMessage(msg)) {
        handleCheckAuth(ws, false);
      } else {
        const requestEvent = parseClientRequestEvent(msg);
        if (requestEvent?.type === 'tool_approval_response') {
          // P4 will consume this message in realHandler's approval wait-queue.
          return;
        }

        if (requestEvent?.type === 'git_status_request') {
          const validated = validateGitRequestEvent(msg, {
            boundWorkspaceRoot: wsWorkspaceRootByConnection.get(ws),
          });

          if (!validated.ok) {
            ws.send(
              wrapEvent(
                'error',
                {
                  error: `${validated.error.code}: ${validated.error.message}`,
                },
                requestEvent.correlationId
              )
            );
            return;
          }

          if (!wsWorkspaceRootByConnection.has(ws)) {
            wsWorkspaceRootByConnection.set(
              ws,
              validated.value.payload.workspaceRoot
            );
          }

          const snapshot = getGitStatusSnapshot(validated.value.payload.cwd);
          ws.send(
            wrapEvent('git_status', snapshot, validated.value.correlationId)
          );
          return;
        }

        if (requestEvent) {
          ws.send(
            wrapEvent(
              'error',
              { error: `Unsupported request type: ${requestEvent.type}` },
              requestEvent.correlationId
            )
          );
          return;
        }

        ws.send(wrapEvent('error', { error: 'Unsupported message type' }));
      }
    } catch {
      ws.send(wrapEvent('error', { error: 'Invalid message format' }));
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

server.listen(PORT, '127.0.0.1', () => {
  // Server bound to loopback only
});
