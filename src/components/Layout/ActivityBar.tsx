import { useUIStore } from '../../stores/uiStore';
import type { SidebarPanel } from '../../stores/uiStore';

const panels: { key: SidebarPanel; icon: React.ReactNode }[] = [
  {
    key: 'sessions',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 5h12M4 10h12M4 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function ActivityBar() {
  const { activePanel, setActivePanel, sidebarCollapsed, toggleSidebar } = useUIStore();

  const handleClick = (key: SidebarPanel) => {
    if (activePanel === key && !sidebarCollapsed) {
      toggleSidebar();
    } else {
      setActivePanel(key);
    }
  };

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        {panels.map((p) => (
          <button
            key={p.key}
            className={`activity-btn ${activePanel === p.key && !sidebarCollapsed ? 'active' : ''}`}
            onClick={() => handleClick(p.key)}
            title={p.key}
          >
            {p.icon}
          </button>
        ))}
      </div>
      <div className="activity-bar-bottom">
        <button
          className={`activity-btn ${activePanel === 'settings' && !sidebarCollapsed ? 'active' : ''}`}
          onClick={() => handleClick('settings')}
          title="Settings"
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
