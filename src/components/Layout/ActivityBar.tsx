import { useUIStore } from '../../stores/uiStore';

function SessionsIcon({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M4 6.25C4 5.007 5.007 4 6.25 4h7.5C14.993 4 16 5.007 16 6.25v4.5C16 11.993 14.993 13 13.75 13H8.4L5 15.8V13H6.25C5.007 13 4 11.993 4 10.75v-4.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 5h12M4 10h12M4 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function ActivityBar() {
  const { activePanel, setActivePanel, sidebarCollapsed } = useUIStore();
  const sessionsLabel = sidebarCollapsed ? 'Open conversations' : 'Conversations';

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        <button
          className={`activity-btn ${activePanel === 'sessions' && !sidebarCollapsed ? 'active' : ''} ${sidebarCollapsed ? 'launcher-collapsed' : ''}`}
          onClick={() => setActivePanel('sessions')}
          title={sessionsLabel}
          aria-label={sessionsLabel}
          type="button"
        >
          <SessionsIcon collapsed={sidebarCollapsed} />
        </button>
      </div>
      <div className="activity-bar-bottom">
        <button
          className={`activity-btn ${activePanel === 'settings' && !sidebarCollapsed ? 'active' : ''}`}
          onClick={() => setActivePanel('settings')}
          title="Settings"
          aria-label="Open settings"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
