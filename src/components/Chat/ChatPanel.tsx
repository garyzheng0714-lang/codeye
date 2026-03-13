import MessageList from './MessageList';
import InputArea from './InputArea';
import WelcomeScreen from './WelcomeScreen';
import { useChatStore } from '../../stores/chatStore';

export default function ChatPanel() {
  const { messages } = useChatStore();

  return (
    <div className="chat-panel">
      {messages.length === 0 ? <WelcomeScreen /> : <MessageList />}
      <InputArea />
    </div>
  );
}
