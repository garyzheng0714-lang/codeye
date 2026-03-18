import { memo, useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { filterCommands, type SlashCommand } from '../../data/slashCommands';

export interface SlashPaletteHandle {
  navigateUp: () => void;
  navigateDown: () => void;
  selectActive: () => void;
  getActiveCommand: () => SlashCommand | undefined;
}

interface SlashPaletteProps {
  query: string;
  visible: boolean;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export default memo(forwardRef<SlashPaletteHandle, SlashPaletteProps>(function SlashPalette({ query, visible, onSelect }, ref) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const matches = filterCommands(query);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useImperativeHandle(ref, () => ({
    navigateUp: () => setActiveIndex((i) => Math.max(i - 1, 0)),
    navigateDown: () => setActiveIndex((i) => Math.min(i + 1, matches.length - 1)),
    selectActive: () => {
      if (matches[activeIndex]) onSelect(matches[activeIndex]);
    },
    getActiveCommand: () => matches[activeIndex],
  }), [activeIndex, matches, onSelect]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!visible || matches.length === 0) return null;

  const categoryLabels: Record<string, string> = {
    mode: 'Mode',
    model: 'Model',
    effort: 'Thinking',
    action: 'Action',
    skill: 'Skill',
  };

  return (
    <div className="slash-palette" role="listbox" aria-label="Slash commands">
      <div className="slash-palette-list" ref={listRef}>
        {matches.map((cmd, i) => (
          <button
            key={cmd.name}
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            className={`slash-palette-item ${i === activeIndex ? 'active' : ''}`}
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => onSelect(cmd)}
          >
            <span className="slash-palette-name">/{cmd.name}</span>
            <span className="slash-palette-desc">{cmd.description}</span>
            <span className="slash-palette-category">{categoryLabels[cmd.category] ?? cmd.category}</span>
          </button>
        ))}
      </div>
    </div>
  );
}));
