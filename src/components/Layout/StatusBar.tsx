import { useChatStore } from '../../stores/chatStore';
import ModelSelector from '../Chat/ModelSelector';

export default function StatusBar() {
  const { isStreaming, mode, cost, inputTokens, outputTokens } = useChatStore();

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-item">
          <span className={`status-dot ${isStreaming ? 'streaming' : 'idle'}`} />
          <span>{isStreaming ? 'Streaming' : 'Ready'}</span>
        </span>
      </div>
      <div className="status-bar-center">
        {isStreaming && (
          <div className="status-progress">
            <div className="status-progress-bar" />
          </div>
        )}
      </div>
      <div className="status-bar-right">
        <span className="mode-badge">{mode}</span>
        <ModelSelector />
        <span className="status-item">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 8V2M3 4l2-2 2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {inputTokens.toLocaleString()}
        </span>
        <span className="status-item">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 2v6M3 6l2 2 2-2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {outputTokens.toLocaleString()}
        </span>
        <span className="status-item">${cost.toFixed(4)}</span>
      </div>
    </div>
  );
}
