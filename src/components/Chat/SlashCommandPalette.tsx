import { useState, useEffect, useRef, useCallback } from 'react';
import {
  filterCommands,
  groupByCategory,
  categoryLabels,
  slashCommandCategoryOrder,
  type SlashCommand,
} from '../../data/slashCommands';
import { getCommandIcon } from '../../data/commandIcons';

interface Props {
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  visible: boolean;
}

export default function SlashCommandPalette({ query, onSelect, onClose, visible }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = filterCommands(query);
  const grouped = groupByCategory(filtered);
  const flatList = filtered;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible || flatList.length === 0) return;
      const activeEl = document.activeElement;
      const inComposer =
        activeEl instanceof HTMLTextAreaElement
        && (activeEl.classList.contains('input-textarea') || activeEl.classList.contains('split-input-textarea'));
      if (!inComposer) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % flatList.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + flatList.length) % flatList.length);
      } else if ((e.key === 'Enter' || e.key === 'Tab') && flatList.length > 0) {
        e.preventDefault();
        const safeIndex = Math.min(activeIndex, flatList.length - 1);
        onSelect(flatList[safeIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [visible, flatList, activeIndex, onSelect, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!visible || flatList.length === 0) return null;

  let globalIdx = 0;

  return (
    <div className="slash-palette" ref={listRef}>
      <div className="slash-palette-header">
        <span className="slash-palette-title">Commands</span>
        <span className="slash-palette-hint">
          <kbd>↑↓</kbd> navigate <kbd>↵/tab</kbd> select <kbd>esc</kbd> close
        </span>
      </div>
      <div className="slash-palette-list">
        {slashCommandCategoryOrder.map((cat) => {
          const items = grouped[cat];
          if (!items?.length) return null;
          return (
            <div key={cat} className="slash-palette-group">
              <div className="slash-palette-category">{categoryLabels[cat]}</div>
              {items.map((cmd) => {
                const idx = globalIdx++;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={`${cmd.category}-${cmd.name}`}
                    ref={(el) => { itemRefs.current[idx] = el; }}
                    className={`slash-palette-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelect(cmd)}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(idx)}
                    type="button"
                  >
                    <span className="slash-palette-icon">{getCommandIcon(cmd.icon)}</span>
                    <span className="slash-palette-name">/{cmd.name}</span>
                    <span className="slash-palette-desc">{cmd.description}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
