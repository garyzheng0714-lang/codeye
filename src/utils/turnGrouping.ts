import type { DisplayMessage } from '../types';

export interface Turn {
  id: string;
  userMessage: DisplayMessage;
  assistantMessages: DisplayMessage[];
  timestamp: number;
}

export function groupMessagesIntoTurns(messages: DisplayMessage[]): Turn[] {
  const turns: Turn[] = [];
  let currentTurn: Turn | null = null;

  for (const msg of messages) {
    if (msg.role === 'user') {
      currentTurn = {
        id: `turn-${msg.id}`,
        userMessage: msg,
        assistantMessages: [],
        timestamp: msg.timestamp,
      };
      turns.push(currentTurn);
    } else if (msg.role === 'assistant') {
      if (currentTurn) {
        currentTurn.assistantMessages.push(msg);
      } else {
        currentTurn = {
          id: `turn-orphan-${msg.id}`,
          userMessage: {
            id: `synthetic-${msg.id}`,
            role: 'user',
            content: '',
            toolCalls: [],
            timestamp: msg.timestamp,
          },
          assistantMessages: [msg],
          timestamp: msg.timestamp,
        };
        turns.push(currentTurn);
      }
    }
  }

  return turns;
}

/**
 * Incrementally update turns when only the last message changed (streaming append).
 * Returns null if a full regroup is needed.
 */
export function updateLastTurn(
  prevTurns: Turn[],
  messages: DisplayMessage[],
): Turn[] | null {
  if (messages.length === 0) return [];
  if (prevTurns.length === 0) return null;

  const lastMsg = messages[messages.length - 1];

  if (lastMsg.role === 'assistant') {
    const lastTurn = prevTurns[prevTurns.length - 1];
    const lastTurnAssistantIds = lastTurn.assistantMessages.map((m) => m.id);

    if (lastTurnAssistantIds.includes(lastMsg.id)) {
      const updatedAssistant = lastTurn.assistantMessages.map((m) =>
        m.id === lastMsg.id ? lastMsg : m,
      );
      return [...prevTurns.slice(0, -1), { ...lastTurn, assistantMessages: updatedAssistant }];
    }

    if (lastTurn.userMessage) {
      return [
        ...prevTurns.slice(0, -1),
        { ...lastTurn, assistantMessages: [...lastTurn.assistantMessages, lastMsg] },
      ];
    }
  }

  return null;
}
