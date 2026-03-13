import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';
import { sendClaudeQuery } from '../../hooks/useClaudeChat';

export default function HintCard({ text }: { text: string }) {
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const startAssistantMessage = useChatStore((s) => s.startAssistantMessage);
  const mode = useChatStore((s) => s.mode);
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
