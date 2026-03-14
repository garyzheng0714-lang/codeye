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

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 5.25a4.75 4.75 0 1 0 0 9.5 4.75 4.75 0 0 0 0-9.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10 2.75v1.5M10 15.75v1.5M4.7 4.7l1.06 1.06M14.24 14.24l1.06 1.06M2.75 10h1.5M15.75 10h1.5M4.7 15.3l1.06-1.06M14.24 5.76l1.06-1.06"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ActivityBar() {
  const { activePanel, setActivePanel, sidebarCollapsed } = useUIStore();
  const sessionsLabel = sidebarCollapsed ? 'Open conversations' : 'Conversations';
  const settingsLabel = 'Open settings';

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
        <button
          className={`activity-btn ${activePanel === 'settings' && !sidebarCollapsed ? 'active' : ''}`}
          onClick={() => setActivePanel('settings')}
          title={settingsLabel}
          aria-label={settingsLabel}
          type="button"
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
  );
}
