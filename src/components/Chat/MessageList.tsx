import { useEffect, useRef, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useChatStore } from '../../stores/chatStore';
import { groupMessagesIntoTurns } from '../../utils/turnGrouping';
import TurnGroup from './TurnGroup';

const VIRTUAL_THRESHOLD = 40;

export default memo(function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages]);

  const useVirtual = turns.length > VIRTUAL_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
    enabled: useVirtual,
  });

  useEffect(() => {
    if (useVirtual) {
      if (turns.length > 0) {
        virtualizer.scrollToIndex(turns.length - 1, { align: 'end' });
      }
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, useVirtual, turns.length, virtualizer]);

  if (useVirtual) {
    const items = virtualizer.getVirtualItems();
    return (
      <div className="message-list" ref={parentRef} style={{ overflowY: 'auto', height: '100%' }}>
        <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
          {items.map((virtualItem) => (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TurnGroup
                turn={turns[virtualItem.index]}
                isLast={virtualItem.index === turns.length - 1}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {turns.map((turn, i) => (
        <TurnGroup key={turn.id} turn={turn} isLast={i === turns.length - 1} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
});
