import MessageList from './MessageList';
import InputArea from './InputArea';
import WelcomeScreen from './WelcomeScreen';
import MessageSearch from './MessageSearch';
import { useChatStore } from '../../stores/chatStore';

export default function ChatPanel() {
  const hasMessages = useChatStore((s) => s.messages.length > 0);

  return (
    <div className="chat-panel">
      <MessageSearch />
      {hasMessages ? <MessageList /> : <WelcomeScreen />}
      <InputArea />
    </div>
  );
}
