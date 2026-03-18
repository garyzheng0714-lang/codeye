import { memo, useRef } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { stopClaude } from '../../hooks/useClaudeChat';
import { useInputComposer } from '../../hooks/useInputComposer';
import InputFooter from './InputFooter';
import TaskProgressCard from './TaskProgressCard';
import SlashPalette, { type SlashPaletteHandle } from './SlashPalette';

export default memo(function InputArea() {
  const paletteRef = useRef<SlashPaletteHandle>(null);
  const {
    input,
    mode,
    isStreaming,
    canSend,
    showPalette,
    slashQuery,
    paletteHasMatches,
    textareaRef,
    composingRef,
    placeholders,
    handleKeyDown: composerHandleKeyDown,
    handleInput,
    handlePaste,
    handleSend,
    handleCommandSelect,
    setShowPalette,
  } = useInputComposer();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Slash palette keyboard navigation — handled here, not in the palette
    if (showPalette && paletteHasMatches) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        paletteRef.current?.navigateDown();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        paletteRef.current?.navigateUp();
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        paletteRef.current?.selectActive();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowPalette(false);
        return;
      }
    }
    // Everything else delegates to the composer
    composerHandleKeyDown(e);
  };

  return (
    <div className={`input-area ${isStreaming ? 'is-streaming' : ''}`}>
      <div className="input-container-wrapper">
        <TaskProgressCard />
        <div className={`input-container ${isStreaming ? 'is-streaming' : ''}`} style={{ position: 'relative' }}>
          <SlashPalette
            ref={paletteRef}
            query={slashQuery}
            visible={showPalette}
            onSelect={handleCommandSelect}
            onClose={() => setShowPalette(false)}
          />
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
