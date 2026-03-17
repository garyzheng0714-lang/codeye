import { useChatStore } from '../../stores/chatStore';
import type { ChatMode } from '../../types';
import { t } from '../../i18n';
import { FlowArrow, Bug, Wrench, TestTube } from '@phosphor-icons/react';
import CodeyeMark from '../Brand/CodeyeMark';
import HintCard from './HintCard';
import { MOCK_MESSAGES } from '../../data/mockConversation';

const hints = [
  { text: 'Explain the auth flow in this project', icon: FlowArrow },
  { text: 'Find and fix bugs in the API handlers', icon: Bug },
  { text: 'Refactor the database layer', icon: Wrench },
  { text: 'Write tests for the core modules', icon: TestTube },
];

const modeDescriptions: Record<ChatMode, string> = {
  chat: 'Ask questions about your codebase, get explanations, and explore ideas.',
  code: 'Write, edit, and debug code with full file system access.',
  plan: 'Plan architecture and implementation strategies without modifying files.',
};

export default function WelcomeScreen() {
  const mode = useChatStore((s) => s.mode);
  const loadSession = useChatStore((s) => s.loadSession);

  const loadDemo = () => {
    loadSession({
      messages: MOCK_MESSAGES,
      cost: 0.042,
      inputTokens: 12_500,
      outputTokens: 3_800,
    });
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-logo">
          <CodeyeMark size={72} />
        </div>
        <h1 className="welcome-title">{t('app.name')}</h1>
        <p className="welcome-subtitle">{modeDescriptions[mode]}</p>
        <div className="welcome-hints">
          {hints.map((h) => (
            <HintCard key={h.text} text={h.text} icon={h.icon} />
          ))}
        </div>
        <button
          type="button"
          onClick={loadDemo}
          style={{
            marginTop: 24,
            padding: '8px 20px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
          }}
        >
          Load Demo Conversation
        </button>
      </div>
    </div>
  );
}
