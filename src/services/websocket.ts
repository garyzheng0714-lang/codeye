const WS_URL = 'ws://localhost:5174';
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const HEARTBEAT_INTERVAL = 30000;

type WsMessageListener = (event: MessageEvent) => void;

let globalWs: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectDelay = INITIAL_RECONNECT_DELAY;
const pendingMessages: string[] = [];
const messageListeners = new Set<WsMessageListener>();

function attachMessageListeners(ws: WebSocket) {
  for (const listener of messageListeners) {
    ws.addEventListener('message', listener);
  }
}

function flushPending(ws: WebSocket) {
  while (pendingMessages.length > 0) {
    const msg = pendingMessages.shift()!;
    ws.send(msg);
  }
}

function startHeartbeat(ws: WebSocket) {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function connectWs(): WebSocket {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const ws = new WebSocket(WS_URL);
  globalWs = ws;
  attachMessageListeners(ws);

  ws.onopen = () => {
    reconnectDelay = INITIAL_RECONNECT_DELAY;
    startHeartbeat(ws);
    flushPending(ws);
  };

  ws.onclose = () => {
    stopHeartbeat();
    if (globalWs === ws) {
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      reconnectTimer = setTimeout(() => connectWs(), reconnectDelay);
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

export function subscribeWsMessages(listener: WsMessageListener): () => void {
  if (window.electronAPI) return () => {};

  messageListeners.add(listener);
  const ws = getOrCreateWs();
  if (ws) {
    ws.addEventListener('message', listener);
  }

  return () => {
    messageListeners.delete(listener);
    ws?.removeEventListener('message', listener);
    if (globalWs && globalWs !== ws) {
      globalWs.removeEventListener('message', listener);
    }
  };
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
