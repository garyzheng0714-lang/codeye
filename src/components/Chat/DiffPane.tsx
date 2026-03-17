import { useState, useEffect, useRef, memo } from 'react';
import { diffService, type DiffResult } from '../../services/diffService';

function DiffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="diff-icon">
      <path d="M3 1v12M11 1v12M1 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DiffLine({ line, index }: { line: string; index: number }) {
  let className = 'diff-line';
  if (line.startsWith('+') && !line.startsWith('+++')) className += ' diff-line--added';
  else if (line.startsWith('-') && !line.startsWith('---')) className += ' diff-line--removed';
  else if (line.startsWith('@@')) className += ' diff-line--hunk';
  else if (line.startsWith('\\')) className += ' diff-line--meta';

  return (
    <div className={className} data-line={index}>
      <span className="diff-line-content">{line}</span>
    </div>
  );
}

function DiffContent({ diff }: { diff: DiffResult }) {
  const lines = diff.patch.split('\n');
  // Skip the first 2 lines (--- and +++ headers from unified diff)
  const contentLines = lines.filter((l) => !l.startsWith('---') && !l.startsWith('+++') && !l.startsWith('Index:') && !l.startsWith('==='));

  return (
    <div className="diff-content">
      {contentLines.map((line, i) => (
        <DiffLine key={i} line={line} index={i} />
      ))}
      {diff.truncated && (
        <div className="diff-truncated-notice">
          Showing first 500 lines of diff
        </div>
      )}
    </div>
  );
}

export default memo(function DiffPane({ onClose }: { onClose: () => void }) {
  const [currentDiff, setCurrentDiff] = useState<DiffResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    diffService.start();
    const unsub = diffService.onDiff((diff) => {
      setCurrentDiff(diff);
    });
    return () => {
      unsub();
      diffService.stop();
    };
  }, []);

  // Auto-scroll to top on new diff
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [currentDiff]);

  return (
    <div className="diff-pane">
      <div className="diff-pane-header">
        <div className="diff-pane-title">
          <DiffIcon />
          {currentDiff ? (
            <>
              <span className="diff-file-name">{currentDiff.fileName}</span>
              {currentDiff.isNewFile && <span className="diff-badge diff-badge--new">new</span>}
              <span className="diff-stats">
                <span className="diff-stats-add">+{currentDiff.addedLines}</span>
                <span className="diff-stats-del">-{currentDiff.removedLines}</span>
              </span>
            </>
          ) : (
            <span>File Changes</span>
          )}
        </div>
        <button
          type="button"
          className="diff-pane-close"
          onClick={onClose}
          title="Close (⌘W)"
          aria-label="Close diff pane"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="diff-pane-body" ref={scrollRef}>
        {!currentDiff ? (
          <div className="diff-pane-empty">
            <p className="diff-empty-title">No file changes yet</p>
            <p className="diff-empty-hint">When Claude edits a file, the diff will appear here</p>
          </div>
        ) : (
          <DiffContent diff={currentDiff} />
        )}
      </div>
    </div>
  );
});
