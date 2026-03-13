type FlushCallback = (chunks: string[]) => void;

const BASE_INTERVAL_MS = 16;
const BUSY_INTERVAL_MS = 50;
const IMMEDIATE_FLUSH_BYTES = 32 * 1024;
const BUSY_THRESHOLD = 10;

export class StreamBatcher {
  private buffer: string[] = [];
  private bufferBytes = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private chunksSinceLastFlush = 0;
  private readonly onFlush: FlushCallback;

  constructor(onFlush: FlushCallback) {
    this.onFlush = onFlush;
  }

  push(chunk: string): void {
    this.buffer.push(chunk);
    this.bufferBytes += chunk.length;
    this.chunksSinceLastFlush += 1;

    if (this.bufferBytes >= IMMEDIATE_FLUSH_BYTES) {
      this.flush();
      return;
    }

    if (!this.timer) {
      const interval =
        this.chunksSinceLastFlush > BUSY_THRESHOLD
          ? BUSY_INTERVAL_MS
          : BASE_INTERVAL_MS;
      this.timer = setTimeout(() => this.flush(), interval);
    }
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length === 0) return;

    const chunks = this.buffer;
    this.buffer = [];
    this.bufferBytes = 0;
    this.chunksSinceLastFlush = 0;

    this.onFlush(chunks);
  }

  destroy(): void {
    this.flush();
  }
}
