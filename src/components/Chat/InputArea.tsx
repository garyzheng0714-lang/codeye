import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Square, X, MoreHorizontal } from 'lucide-react';
import { stopClaude } from '../../hooks/useClaudeChat';
import { useInputComposer } from '../../hooks/useInputComposer';
import SlashCommandPalette from './SlashCommandPalette';
import InputFooter from './InputFooter';
import { formatAttachmentSize } from '../../services/attachments';

function truncateQueuePreview(input: string): string {
  const compact = input.replace(/\s+/g, ' ').trim();
  if (compact.length <= 42) return compact;
  return `${compact.slice(0, 42)}...`;
}

export default function InputArea() {
  const [queueMenuIndex, setQueueMenuIndex] = useState<number | null>(null);
  const queueMenuRef = useRef<HTMLDivElement>(null);
  const {
    input,
    mode,
    isStreaming,
    activeSkill,
    attachments,
    pendingMessages,
    pendingCount,
    canSend,
    showPalette,
    showContextSuggestions,
    slashQuery,
    contextRefs,
    textareaRef,
    composingRef,
    placeholders,
    handleKeyDown,
    handleInput,
    handlePaste,
    handleSend,
    handleCommandSelect,
    handleContextSelect,
    removeAttachment,
    clearAttachments,
    editQueuedMessage,
    removeQueuedMessageAt,
    closeQueue,
    clearActiveSkill,
    setShowPalette,
    CONTEXT_SUGGESTIONS,
  } = useInputComposer();

  const hasContextPills = activeSkill || contextRefs.length > 0 || attachments.length > 0;
  const queueCountLabel = useMemo(
    () => `${pendingCount} message${pendingCount > 1 ? 's' : ''} queued`,
    [pendingCount]
  );

  useEffect(() => {
    if (queueMenuIndex === null) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!queueMenuRef.current?.contains(event.target as Node)) {
        setQueueMenuIndex(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQueueMenuIndex(null);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [queueMenuIndex]);

  const handleQueueEdit = (index: number) => {
    editQueuedMessage(index);
    setQueueMenuIndex(null);
  };

  const handleQueueRemove = (index: number) => {
    removeQueuedMessageAt(index);
    setQueueMenuIndex(null);
  };

  const handleQueueClose = () => {
    closeQueue();
    setQueueMenuIndex(null);
  };

  return (
    <div className={`input-area ${isStreaming ? 'is-streaming' : ''}`}>
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
                type="button"
              >
                <span className="context-suggestion-trigger">{s.trigger}</span>
                <span className="context-suggestion-desc">{s.description}</span>
              </button>
            ))}
          </div>
        )}

        {pendingCount > 0 && (
          <div className="queue-list" ref={queueMenuRef}>
            {pendingMessages.map((queued, index) => (
              <div className="queue-item" key={`queued-${index}-${queued.prompt}`}>
                <button
                  className="queue-item-main"
                  onClick={() => handleQueueEdit(index)}
                  title="Edit queued message"
                  type="button"
                >
                  <span className="queue-item-text">{truncateQueuePreview(queued.prompt)}</span>
                  {queued.attachments.length > 0 && (
                    <span className="queue-item-meta">
                      {queued.attachments.length} attachment{queued.attachments.length > 1 ? 's' : ''}
                    </span>
                  )}
                </button>
                <button
                  className="queue-action-btn"
                  onClick={() => handleQueueRemove(index)}
                  title="Remove queued message"
                  type="button"
                >
                  <X size={12} strokeWidth={2} />
                </button>
                <button
                  className="queue-action-btn"
                  onClick={() => setQueueMenuIndex((prev) => (prev === index ? null : index))}
                  title="Queue options"
                  type="button"
                >
                  <MoreHorizontal size={14} strokeWidth={2} />
                </button>
                {queueMenuIndex === index && (
                  <div className="queue-item-menu">
                    <button className="queue-item-menu-btn" onClick={() => handleQueueEdit(index)} type="button">
                      Edit
                    </button>
                    <button className="queue-item-menu-btn" onClick={handleQueueClose} type="button">
                      Clear queue
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isStreaming && (
              <div className="queue-indicator-note">Streaming — new messages will queue.</div>
            )}
          </div>
        )}

        {hasContextPills && (
          <div className="context-pills">
            {activeSkill && (
              <span className="context-pill skill-pill">
                /{activeSkill}
                <button
                  className="skill-pill-remove"
                  onClick={clearActiveSkill}
                  title="Remove (Esc)"
                  type="button"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </span>
            )}
            {contextRefs.map((ref, i) => (
              <span key={`${ref.type}-${ref.value}-${i}`} className="context-pill">
                {ref.displayLabel}
              </span>
            ))}
            {attachments.map((attachment) => (
              <span key={attachment.id} className="context-pill attachment-pill">
                <span className="attachment-pill-name">{attachment.name}</span>
                <span className="attachment-pill-size">{formatAttachmentSize(attachment.size)}</span>
                <button
                  className="skill-pill-remove"
                  onClick={() => removeAttachment(attachment.id)}
                  title="Remove attachment"
                  type="button"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </span>
            ))}
            {attachments.length > 0 && (
              <button className="attachment-clear-btn" onClick={clearAttachments} type="button">
                Clear
              </button>
            )}
          </div>
        )}

        <div className={`input-container ${isStreaming ? 'is-streaming' : ''}`}>
          <textarea
            ref={textareaRef}
            className={`input-textarea ${isStreaming ? 'is-streaming' : ''}`}
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
              <button className="stop-btn" onClick={stopClaude} title="Stop" type="button">
                <Square size={12} strokeWidth={0} fill="currentColor" />
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!canSend}
                title="Send (Enter)"
                type="button"
              >
                <ArrowUp size={16} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>

        {(isStreaming || pendingCount > 0) && (
          <div className="queue-indicator">
            {isStreaming && <span className="queue-indicator-note">Replying now</span>}
            {pendingCount > 0 && <span>{queueCountLabel}</span>}
          </div>
        )}

        <InputFooter />
      </div>
    </div>
  );
}
