import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { isQueryMessage, isStopMessage, isCheckAuthMessage } from './validators';
import { handleDemoQuery } from './demoHandler';
import { handleRealQuery, handleCheckAuth, clientProcesses } from './realHandler';
import { wrapEvent } from './streamEvent';

const PORT = 5174;
const IS_NESTED = !!process.env.CLAUDECODE;

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:5180', 'http://127.0.0.1:5180'];
  if (origin && !allowedOrigins.includes(origin)) {
    ws.close(1008, 'Forbidden origin');
    return;
  }

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
        ws.send(wrapEvent('complete', {}));
      } else if (isCheckAuthMessage(msg)) {
        handleCheckAuth(ws, IS_NESTED);
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
