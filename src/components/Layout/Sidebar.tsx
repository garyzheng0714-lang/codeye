import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';
import { saveCurrentSession } from '../../utils/session';
import SessionList from '../Session/SessionList';
import SettingsPanel from '../Settings/SettingsPanel';

export default function Sidebar() {
  const { activePanel } = useUIStore();
  const { createSession } = useSessionStore();
  const { clearMessages, cwd } = useChatStore();
  const [search, setSearch] = useState('');

  const handleNewSession = () => {
    saveCurrentSession();
    clearMessages();
    createSession();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-search">
          <svg className="sidebar-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            aria-label="Search sessions"
          />
        </div>
        {activePanel === 'sessions' && (
          <button className="new-session-btn" onClick={handleNewSession} title="New Session (Cmd+N)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      <div className="sidebar-content">
        {activePanel === 'sessions' && <SessionList searchQuery={search} />}
        {activePanel === 'settings' && <SettingsPanel />}
      </div>
      {cwd && (
        <div className="sidebar-footer">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 3.5L6 1l4.5 2.5v5L6 11l-4.5-2.5v-5z" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span className="sidebar-footer-path">{cwd}</span>
        </div>
      )}
    </div>
  );
}
