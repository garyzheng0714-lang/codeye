import { memo } from 'react';
import type { DisplayMessage } from '../../types';

export default memo(function UserMessage({ message }: { message: DisplayMessage }) {
  const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="message-row user-message-row" data-message-id={message.id}>
      <div className="user-message-wrapper">
        <div className="user-bubble-wrapper">
          <div className="user-bubble">{message.content}</div>
          <span className="user-timestamp">{time}</span>
        </div>
        <div className="user-avatar">U</div>
      </div>
    </div>
  );
});
