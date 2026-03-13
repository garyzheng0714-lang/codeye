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
    </div>
  );
}
