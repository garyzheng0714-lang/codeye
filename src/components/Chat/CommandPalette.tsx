import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { Search } from 'lucide-react';
import { filterCommands } from '../../data/slashCommands';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (command: { name: string; description: string; category: string }) => void;
}

export default memo(function CommandPalette({ open, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = filterCommands(query);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      onSelect(filtered[activeIndex]);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, activeIndex, onSelect, onClose]);

  if (!open) return null;

  return (
    <div className="cmd-palette-overlay" onClick={onClose}>
      <div
        className="cmd-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
      >
        <div className="cmd-palette-input-row">
          <Search size={14} strokeWidth={2} className="cmd-palette-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search commands"
          />
          <kbd className="cmd-palette-shortcut">ESC</kbd>
        </div>
        <div className="cmd-palette-list" role="listbox" aria-label="Commands">
          {filtered.length === 0 && (
            <div className="cmd-palette-empty">No matching commands</div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.name}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              className={`cmd-palette-item${i === activeIndex ? ' active' : ''}`}
              onClick={() => { onSelect(cmd); onClose(); }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="cmd-palette-item-name">/{cmd.name}</span>
              <span className="cmd-palette-item-desc">{cmd.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
