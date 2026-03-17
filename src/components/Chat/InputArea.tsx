import { memo } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { stopClaude } from '../../hooks/useClaudeChat';
import { useInputComposer } from '../../hooks/useInputComposer';
import InputFooter from './InputFooter';

export default memo(function InputArea() {
  const {
    input,
    mode,
    isStreaming,
    canSend,
    textareaRef,
    composingRef,
    placeholders,
    handleKeyDown,
    handleInput,
    handlePaste,
    handleSend,
  } = useInputComposer();

  return (
    <div className={`input-area ${isStreaming ? 'is-streaming' : ''}`}>
      <div className="input-container-wrapper">
        <div className={`input-container ${isStreaming ? 'is-streaming' : ''}`}>
          <textarea
            ref={textareaRef}
            className={`input-textarea ${isStreaming ? 'is-streaming' : ''}`}
            aria-label="Message input"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; }}
            placeholder={placeholders[mode]}
            rows={1}
          />
          <div className="input-actions">
            {isStreaming ? (
              <button className="stop-btn" onClick={stopClaude} title="Stop" aria-label="Stop" type="button">
                <Square size={12} strokeWidth={0} fill="currentColor" aria-hidden="true" />
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!canSend}
                title="Send (Enter)"
                aria-label="Send message"
                type="button"
              >
                <ArrowUp size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <InputFooter />
      </div>
    </div>
  );
});
