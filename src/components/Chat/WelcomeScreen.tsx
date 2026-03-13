import { useChatStore } from '../../stores/chatStore';
import type { ChatMode } from '../../types';
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
