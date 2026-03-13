import MessageList from './MessageList';
import InputArea from './InputArea';
import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import { sendClaudeQuery } from '../../hooks/useClaudeChat';

export default function ChatPanel() {
  const { messages } = useChatStore();

  return (
    <div className="chat-panel">
      {messages.length === 0 ? <WelcomeScreen /> : <MessageList />}
      <InputArea />
    </div>
  );
}

const hints = [
  { icon: '?', text: 'Explain the auth flow in this project' },
  { icon: '!', text: 'Find and fix bugs in the API handlers' },
  { icon: '#', text: 'Refactor the database layer' },
  { icon: '*', text: 'Write tests for the core modules' },
];

function WelcomeScreen() {
  const { mode } = useChatStore();

  const modeDesc = {
    chat: 'Ask questions about your codebase, get explanations, and explore ideas.',
    code: 'Write, edit, and debug code with full file system access.',
    plan: 'Plan architecture and implementation strategies without modifying files.',
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-logo">
          <svg width="72" height="72" viewBox="0 0 120 120" fill="none">
            <path d="M52 8C30 10, 10 30, 12 58C14 86, 34 110, 62 110C90 110, 112 86, 110 56C108 28, 88 6, 66 6C60 6, 56 7, 52 8Z" fill="var(--accent)"/>
            <ellipse cx="48" cy="62" rx="9" ry="12" fill="white"/>
            <ellipse cx="72" cy="62" rx="9" ry="12" fill="white"/>
            <ellipse cx="50" cy="65" rx="5" ry="7" fill="var(--text-primary)"/>
            <ellipse cx="74" cy="65" rx="5" ry="7" fill="var(--text-primary)"/>
            <circle cx="30" cy="78" r="3" fill="rgba(30,22,37,0.15)"/>
          </svg>
        </div>
        <h1 className="welcome-title">Codeye</h1>
        <p className="welcome-subtitle">{modeDesc[mode]}</p>
        <div className="welcome-hints">
          {hints.map((h) => (
            <HintCard key={h.text} text={h.text} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HintCard({ text }: { text: string }) {
  const { addUserMessage, startAssistantMessage, mode } = useChatStore();
  const { activeSessionId, createSession } = useSessionStore();

  const handleClick = () => {
    if (!activeSessionId) {
      const preview = text.length > 30 ? text.slice(0, 30) + '...' : text;
      createSession(preview);
    }
    addUserMessage(text);
    startAssistantMessage();
    const state = useChatStore.getState();
    sendClaudeQuery({
      prompt: text,
      mode,
      model: state.model,
      cwd: state.cwd || undefined,
      sessionId: state.claudeSessionId || undefined,
    });
  };

  return (
    <button className="hint-card" onClick={handleClick}>
      {text}
    </button>
  );
}
