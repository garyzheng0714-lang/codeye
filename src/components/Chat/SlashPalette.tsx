import { memo, useState, useEffect, useRef } from 'react';
import { filterCommands, type SlashCommand } from '../../data/slashCommands';

interface SlashPaletteProps {
  query: string;
  visible: boolean;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export default memo(function SlashPalette({ query, visible, onSelect, onClose }: SlashPaletteProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const matches = filterCommands(query);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (matches[activeIndex]) {
          onSelect(matches[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [visible, activeIndex, matches, onSelect, onClose]);

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
});
