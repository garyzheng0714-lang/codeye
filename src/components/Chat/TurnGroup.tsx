import { useState, memo } from 'react';
import type { Turn } from '../../utils/turnGrouping';
import UserMessage from './UserMessage';
import AIMessage from './AIMessage';

interface Props {
  turn: Turn;
  isLast: boolean;
}

export default memo(function TurnGroup({ turn, isLast }: Props) {
  const hasTools = turn.assistantMessages.some((m) => m.toolCalls.length > 0);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);

  return (
    <div className="turn-group">
      {turn.userMessage.content && (
        <UserMessage message={turn.userMessage} />
      )}
      {hasTools && !isLast && turn.assistantMessages.length > 1 && (
        <button
          type="button"
          className="turn-collapse-btn"
          onClick={() => setToolsCollapsed(!toolsCollapsed)}
          aria-expanded={!toolsCollapsed}
        >
          {toolsCollapsed
            ? `Show ${turn.assistantMessages.length} responses`
            : 'Collapse'}
        </button>
      )}
      {(!toolsCollapsed || isLast) ? (
        turn.assistantMessages.map((msg) => (
          <AIMessage key={msg.id} message={msg} />
        ))
      ) : (
        turn.assistantMessages.length > 0 && (
          <AIMessage
            message={turn.assistantMessages[turn.assistantMessages.length - 1]}
          />
        )
      )}
    </div>
  );
});
