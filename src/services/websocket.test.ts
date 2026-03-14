import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MessageListener = (event: MessageEvent) => void;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sent: string[] = [];
  private messageListeners = new Set<MessageListener>();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type !== 'message') return;
    if (typeof listener === 'function') {
      this.messageListeners.add(listener as MessageListener);
      return;
    }
    const objectListener = listener as EventListenerObject;
    this.messageListeners.add((event) => objectListener.handleEvent(event));
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type !== 'message') return;
    if (typeof listener === 'function') {
      this.messageListeners.delete(listener as MessageListener);
    }
  }

  send(data: string): void {
    this.sent.push(data);
  }

  emitMessage(data: string): void {
    const event = new MessageEvent('message', { data });
    for (const listener of this.messageListeners) {
      listener(event);
    }
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new Event('close'));
  }
}

describe('websocket subscriptions', () => {
  const OriginalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    MockWebSocket.instances = [];
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
      MockWebSocket as unknown as typeof WebSocket;
    delete (window as Window & { electronAPI?: unknown }).electronAPI;
  });

  afterEach(() => {
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = OriginalWebSocket;
    vi.useRealTimers();
  });

  it('keeps message listener active after reconnect', async () => {
    const { subscribeWsMessages } = await import('./websocket');
    const received: string[] = [];

    const unsubscribe = subscribeWsMessages((event) => {
      received.push(String(event.data));
    });

    expect(MockWebSocket.instances).toHaveLength(1);
    const first = MockWebSocket.instances[0];
    first.open();
    first.emitMessage('first');

    first.close();
    vi.advanceTimersByTime(2000);

    expect(MockWebSocket.instances).toHaveLength(2);
    const second = MockWebSocket.instances[1];
    second.open();
    second.emitMessage('second');

    expect(received).toEqual(['first', 'second']);

    unsubscribe();
    second.emitMessage('ignored');
    expect(received).toEqual(['first', 'second']);
  });
});
