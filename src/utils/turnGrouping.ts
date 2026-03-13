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
