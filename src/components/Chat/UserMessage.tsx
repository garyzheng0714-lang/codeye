import { memo } from 'react';
import { User } from 'lucide-react';
import type { DisplayMessage } from '../../types';

export default memo(function UserMessage({ message }: { message: DisplayMessage }) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="message-row user-message-row" data-message-id={message.id}>
      {/* 用户头像 */}
      <div className="message-avatar message-avatar--user">
        <User size={16} />
      </div>

      {/* 消息内容 */}
      <div className="message-content-wrapper">
        <div className="message-header">
          <span className="message-sender">You</span>
          <span className="message-timestamp">{formatTime(message.timestamp)}</span>
        </div>
        <div className="user-message-content">{message.content}</div>
      </div>
    </div>
  );
});
