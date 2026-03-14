import { stopClaude } from '../../hooks/useClaudeChat';
import { useInputComposer } from '../../hooks/useInputComposer';
import SlashCommandPalette from './SlashCommandPalette';
import InputFooter from './InputFooter';

export default function InputArea() {
  const {
    input,
    mode,
    isStreaming,
    activeSkill,
    pendingCount,
    showPalette,
    showContextSuggestions,
    slashQuery,
    contextRefs,
    textareaRef,
    composingRef,
    placeholders,
    handleKeyDown,
    handleInput,
    handleSend,
    handleCommandSelect,
    handleContextSelect,
    clearActiveSkill,
    setShowPalette,
    CONTEXT_SUGGESTIONS,
  } = useInputComposer();

  return (
    <div className="input-area">
      <div className="input-container-wrapper">
        <SlashCommandPalette
          query={slashQuery}
          visible={showPalette}
          onSelect={handleCommandSelect}
          onClose={() => setShowPalette(false)}
        />
        {showContextSuggestions && (
          <div className="context-suggestions">
            {CONTEXT_SUGGESTIONS.map((s) => (
              <button
                key={s.type}
                className="context-suggestion-item"
                onClick={() => handleContextSelect(s)}
              >
                <span className="context-suggestion-trigger">{s.trigger}</span>
                <span className="context-suggestion-desc">{s.description}</span>
              </button>
            ))}
          </div>
        )}
        {activeSkill && (
          <div className="context-pills">
            <span className="context-pill skill-pill">
              /{activeSkill}
              <button
                className="skill-pill-remove"
                onClick={clearActiveSkill}
                title="Remove (Esc)"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          </div>
        )}
        {contextRefs.length > 0 && (
          <div className="context-pills">
            {contextRefs.map((ref, i) => (
              <span key={`${ref.type}-${ref.value}-${i}`} className="context-pill">
                {ref.displayLabel}
              </span>
            ))}
          </div>
        )}
        <div className="input-container">
          <textarea
            ref={textareaRef}
            className="input-textarea"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; }}
            placeholder={placeholders[mode]}
            rows={1}
          />
          <div className="input-actions">
            {isStreaming ? (
              <button className="stop-btn" onClick={stopClaude} title="Stop">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
                </svg>
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!input.trim() && !activeSkill}
                title="Send (Enter)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 13L13 8L3 3v4l6 1-6 1v4z" fill="currentColor" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="queue-indicator">
            {pendingCount} message{pendingCount > 1 ? 's' : ''} queued
          </div>
        )}
        <InputFooter />
      </div>
    </div>
  );
}
