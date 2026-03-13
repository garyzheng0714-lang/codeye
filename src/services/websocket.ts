const WS_URL = 'ws://localhost:5174';
const RECONNECT_DELAY = 2000;

let globalWs: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pendingMessages: string[] = [];

function flushPending(ws: WebSocket) {
  while (pendingMessages.length > 0) {
    const msg = pendingMessages.shift()!;
    ws.send(msg);
  }
}

function connectWs(): WebSocket {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const ws = new WebSocket(WS_URL);
  globalWs = ws;

  ws.onopen = () => flushPending(ws);

  ws.onclose = () => {
    if (globalWs === ws) {
      reconnectTimer = setTimeout(() => connectWs(), RECONNECT_DELAY);
    }
  };

  ws.onerror = () => {
    // onclose will fire after this
  };

  return ws;
}

export function getOrCreateWs(): WebSocket | null {
  if (window.electronAPI) return null;
  if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) {
    return globalWs;
  }
  return connectWs();
}

export function sendMessage(payload: Record<string, unknown>) {
  if (window.electronAPI) return;

  const data = JSON.stringify(payload);
  const ws = getOrCreateWs();

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(data);
  } else {
    pendingMessages.push(data);
  }
}
