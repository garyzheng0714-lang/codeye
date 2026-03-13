const WS_URL = 'ws://localhost:5174';
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const HEARTBEAT_INTERVAL = 30000;

let globalWs: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectDelay = INITIAL_RECONNECT_DELAY;
let reconnectCount = 0;
let pendingMessages: string[] = [];

type ConnectionListener = (status: 'connected' | 'disconnected' | 'connecting') => void;
const connectionListeners = new Set<ConnectionListener>();

function notifyListeners(status: 'connected' | 'disconnected' | 'connecting') {
  for (const listener of connectionListeners) {
    listener(status);
  }
}

export function onConnectionChange(listener: ConnectionListener): () => void {
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
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

  notifyListeners('connecting');
  const ws = new WebSocket(WS_URL);
  globalWs = ws;

  ws.onopen = () => {
    reconnectDelay = INITIAL_RECONNECT_DELAY;
    reconnectCount = 0;
    notifyListeners('connected');
    startHeartbeat(ws);
    flushPending(ws);
  };

  ws.onclose = () => {
    stopHeartbeat();
    notifyListeners('disconnected');
    if (globalWs === ws) {
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      reconnectCount += 1;
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

export function getReconnectCount(): number {
  return reconnectCount;
}
