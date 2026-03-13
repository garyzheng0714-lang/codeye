import { useEffect, useRef, useState } from 'react';
import { sendClaudeQuery } from '../../hooks/useClaudeChat';
import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';

interface GitAction {
  key: 'commit' | 'push' | 'pr';
  title: string;
  description: string;
  prompt: string;
}

const gitActions: GitAction[] = [
  {
    key: 'commit',
    title: 'Commit Changes',
    description: 'Review the diff and create a clean commit.',
    prompt: 'Review the current git diff, then create a concise commit with a clear message and tell me exactly what you committed.',
  },
  {
    key: 'push',
    title: 'Push Branch',
    description: 'Verify branch state and push the current branch.',
    prompt: 'Check the current branch and remote state, then push the branch safely and tell me the branch name and remote you used.',
  },
  {
    key: 'pr',
    title: 'Create PR',
    description: 'Prepare a pull request summary and open a PR.',
    prompt: 'Inspect the current branch, summarize the changes, and create a pull request with a crisp title and body. Tell me the PR title you used.',
  },
];

function GitActionIcon({ action }: { action: GitAction['key'] }) {
  if (action === 'commit') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="12" height="10" rx="3" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6.5 9H11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (action === 'push') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M9 13V4.5M9 4.5L5.8 7.7M9 4.5L12.2 7.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 13.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="4.5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="13" r="1.7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.4 5.4L11.2 4.7M6.1 6.3L11.7 11.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function GitActionMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const startAssistantMessage = useChatStore((s) => s.startAssistantMessage);
  const setMode = useChatStore((s) => s.setMode);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const createSession = useSessionStore((s) => s.createSession);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const runAction = (action: GitAction) => {
    if (isStreaming) return;

    if (!activeSessionId) {
      createSession(action.title);
    }

    setMode('code');
    addUserMessage(action.prompt);
    startAssistantMessage();

    const state = useChatStore.getState();
    sendClaudeQuery({
      prompt: action.prompt,
      mode: 'code',
      model: state.model,
      effort: state.effort,
      cwd: state.cwd || undefined,
      sessionId: state.claudeSessionId || undefined,
    });

    setOpen(false);
  };

  const handleCommitDirect = () => {
    if (isStreaming) return;
    runAction(gitActions[0]);
  };

  return (
    <div className={`git-pill-shell ${open ? 'open' : ''}`} ref={menuRef}>
      <div className={`git-split-btn ${open ? 'open' : ''}`}>
        <button
          type="button"
          className="git-split-main"
          onClick={handleCommitDirect}
          disabled={isStreaming}
          title="Commit changes"
        >
          <span className="git-chip-mark" aria-hidden="true" />
          <span className="title-chip-text">Submit</span>
        </button>
        <button
          type="button"
          className="git-split-chevron"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          title="More git actions"
        >
          <svg className={`git-pill-chevron ${open ? 'open' : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className={`git-dropdown ${open ? 'open' : ''}`} role="menu" aria-hidden={!open}>
        <div className="git-dropdown-header">
          <span className="git-dropdown-title">Git Actions</span>
          <span className="git-dropdown-hint">Commit, push, or open a PR from here.</span>
        </div>

        <div className="git-menu-list">
          {gitActions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="git-menu-item"
              role="menuitem"
              onClick={() => runAction(action)}
              disabled={isStreaming}
            >
              <span className="git-menu-icon">
                <GitActionIcon action={action.key} />
              </span>
              <span className="git-menu-copy">
                <span className="git-menu-title">{action.title}</span>
                <span className="git-menu-description">{action.description}</span>
              </span>
              <svg className="git-menu-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M4.5 3.5L9.5 7L4.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
