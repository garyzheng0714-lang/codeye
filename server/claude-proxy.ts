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
import { resolveApprovalResponse } from './approvalQueue';
import {
  getGitStatusSnapshot,
  getDiffStat,
  handleGitWriteRequest,
  getOperationStatus,
} from './gitHandler';

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
          const payload = requestEvent.payload as { approvalId: string; decision: 'allow' | 'deny' };
          resolveApprovalResponse(payload.approvalId, payload.decision);
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

        if (requestEvent?.type === 'git_diff_stat_request') {
          const validated = validateGitRequestEvent(msg, {
            boundWorkspaceRoot: wsWorkspaceRootByConnection.get(ws),
          });

          if (!validated.ok) {
            ws.send(
              wrapEvent(
                'error',
                { error: `${validated.error.code}: ${validated.error.message}` },
                requestEvent.correlationId
              )
            );
            return;
          }

          const diffStat = getDiffStat(validated.value.payload.cwd);
          ws.send(
            wrapEvent('git_diff_stat', diffStat, validated.value.correlationId)
          );
          return;
        }

        if (
          requestEvent?.type === 'git_commit_request' ||
          requestEvent?.type === 'git_push_request' ||
          requestEvent?.type === 'git_pr_request'
        ) {
          const validated = validateGitRequestEvent(msg, {
            boundWorkspaceRoot: wsWorkspaceRootByConnection.get(ws),
          });

          if (!validated.ok) {
            ws.send(
              wrapEvent(
                'error',
                { error: `${validated.error.code}: ${validated.error.message}` },
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

          const actionMap = {
            git_commit_request: 'commit',
            git_push_request: 'push',
            git_pr_request: 'pr',
          } as const;

          const payload = validated.value.payload as Record<string, unknown>;
          handleGitWriteRequest({
            action: actionMap[validated.value.type as keyof typeof actionMap],
            cwd: validated.value.payload.cwd,
            operationId: payload.operationId as string,
            message: payload.message as string | undefined,
            remote: payload.remote as string | undefined,
            branch: payload.branch as string | undefined,
            title: payload.title as string | undefined,
            body: payload.body as string | undefined,
            base: payload.base as string | undefined,
            head: payload.head as string | undefined,
          }).then((result) => {
            const resultTypeMap = {
              commit: 'git_commit_result',
              push: 'git_push_result',
              pr: 'git_pr_result',
            } as const;
            const resultType = resultTypeMap[actionMap[validated.value.type as keyof typeof actionMap]];
            ws.send(
              wrapEvent(
                resultType,
                result as unknown as Record<string, unknown>,
                validated.value.correlationId
              )
            );
          });
          return;
        }

        if (requestEvent?.type === 'git_operation_status_request') {
          const validated = validateGitRequestEvent(msg, {
            boundWorkspaceRoot: wsWorkspaceRootByConnection.get(ws),
          });

          if (!validated.ok) {
            ws.send(
              wrapEvent(
                'error',
                { error: `${validated.error.code}: ${validated.error.message}` },
                requestEvent.correlationId
              )
            );
            return;
          }

          const payload = validated.value.payload as Record<string, unknown>;
          const status = getOperationStatus(payload.operationId as string);
          if (status) {
            ws.send(
              wrapEvent(
                'git_operation_status',
                status as unknown as Record<string, unknown>,
                validated.value.correlationId
              )
            );
          } else {
            ws.send(
              wrapEvent(
                'git_operation_status',
                {
                  operationId: payload.operationId,
                  status: 'unknown',
                  updatedAt: Date.now(),
                },
                validated.value.correlationId
              )
            );
          }
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
