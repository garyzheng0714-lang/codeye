import { useState, useRef, useMemo } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';

interface Props {
  searchQuery?: string;
}

export default function SessionList({ searchQuery = '' }: Props) {
  const { sessions, activeSessionId, setActiveSession, deleteSession, renameSession, saveSessionMessages } = useSessionStore();
  const chatStore = useChatStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => s.name.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  const groupedSessions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const weekAgo = today - 7 * 86400000;

    const groups: { label: string; items: typeof filteredSessions }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'This Week', items: [] },
      { label: 'Earlier', items: [] },
    ];

    for (const s of filteredSessions) {
      const t = s.updatedAt;
      if (t >= today) groups[0].items.push(s);
      else if (t >= yesterday) groups[1].items.push(s);
      else if (t >= weekAgo) groups[2].items.push(s);
      else groups[3].items.push(s);
    }

    return groups.filter((g) => g.items.length > 0);
  }, [filteredSessions]);

  const handleSelect = (id: string) => {
    if (id === activeSessionId) return;

    if (activeSessionId && chatStore.messages.length > 0) {
      saveSessionMessages(
        activeSessionId,
        chatStore.messages,
        chatStore.cost,
        chatStore.inputTokens,
        chatStore.outputTokens
      );
    }

    const session = sessions.find((s) => s.id === id);
    setActiveSession(id);

    if (session?.messages.length) {
      chatStore.loadSession({
        messages: session.messages,
        cost: session.cost,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        claudeSessionId: session.claudeSessionId,
      });
    } else {
      chatStore.clearMessages();
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    if (id === activeSessionId) {
      chatStore.clearMessages();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(name);
    // autoFocus + onFocus handles select
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameSession(editingId, editName.trim());
    }
    setEditingId(null);
  };

  if (filteredSessions.length === 0) {
    return (
      <div className="empty-state">
        <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
          <path d="M6 18h36" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="14" r="1.5" fill="currentColor" />
          <circle cx="17" cy="14" r="1.5" fill="currentColor" />
          <circle cx="22" cy="14" r="1.5" fill="currentColor" />
        </svg>
        <p>{searchQuery ? 'No matching sessions' : 'No sessions yet'}</p>
        <p>Start a new conversation with Cmd+N</p>
      </div>
    );
  }

  return (
    <div className="session-list">
      {groupedSessions.map((group) => (
        <div key={group.label}>
          <div className="session-group-label">{group.label}</div>
          {group.items.map((session) => {
            const msgCount = session.messages.length;
            const isEditing = editingId === session.id;
            return (
              <div
                key={session.id}
                className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                onClick={() => handleSelect(session.id)}
              >
                <span className="session-item-icon">#</span>
                <div className="session-item-content" onDoubleClick={(e) => handleDoubleClick(e, session.id, session.name)}>
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      className="session-rename-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      onFocus={(e) => e.target.select()}
                    />
                  ) : (
                    <span className="session-name">{session.name}</span>
                  )}
                  <span className="session-meta">
                    {msgCount > 0 ? `${msgCount} msgs` : 'Empty'}
                    {' \u00B7 '}
                    {new Date(session.updatedAt).toLocaleString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="session-actions">
                  <button
                    className="session-delete"
                    onClick={(e) => handleDelete(e, session.id)}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
