import { useChatStore } from '../../stores/chatStore';
import type { ChatMode } from '../../types';
import CodeyeMark from '../Brand/CodeyeMark';
import HintCard from './HintCard';

const hints = [
  { text: 'Explain the auth flow in this project' },
  { text: 'Find and fix bugs in the API handlers' },
  { text: 'Refactor the database layer' },
  { text: 'Write tests for the core modules' },
];

const modeDescriptions: Record<ChatMode, string> = {
  chat: 'Ask questions about your codebase, get explanations, and explore ideas.',
  code: 'Write, edit, and debug code with full file system access.',
  plan: 'Plan architecture and implementation strategies without modifying files.',
};

export default function WelcomeScreen() {
  const { mode } = useChatStore();

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-logo">
          <CodeyeMark size={72} />
        </div>
        <h1 className="welcome-title">Codeye</h1>
        <p className="welcome-subtitle">{modeDescriptions[mode]}</p>
        <div className="welcome-hints">
          {hints.map((h) => (
            <HintCard key={h.text} text={h.text} />
          ))}
        </div>
      </div>
    </div>
  );
}
