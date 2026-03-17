import { memo } from 'react';
import type { DisplayMessage } from '../../types';

const CLI_SYSTEM_TAG_RE = /^<(?:command-name|local-command-caveat|system-reminder|system-instruction|system_instruction|EXTREMELY_IMPORTANT|available-deferred-tools|antml:)/;

function isCliSystemMessage(content: string): boolean {
  return CLI_SYSTEM_TAG_RE.test(content.trimStart());
}

export default memo(function UserMessage({ message }: { message: DisplayMessage }) {
  if (!message.content || isCliSystemMessage(message.content)) {
    return null;
  }

  return (
    <div className="message-row user-message-row" data-message-id={message.id}>
      <div className="message-avatar message-avatar--user">Y</div>
      <div className="message-content-wrapper">
        <div className="user-message-content">{message.content}</div>
      </div>
    </div>
  );
});
