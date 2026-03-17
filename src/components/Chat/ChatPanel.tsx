import { memo } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import WelcomeScreen from './WelcomeScreen';
import { useChatStore } from '../../stores/chatStore';

export default memo(function ChatPanel() {
  const hasMessages = useChatStore((s) => s.messages.length > 0);

  return (
    <div className="chat-panel">
      {hasMessages ? <MessageList /> : <WelcomeScreen />}
      <InputArea />
    </div>
  );
});
