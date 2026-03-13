import CodeyeMark from '../Brand/CodeyeMark';
import { useUIStore } from '../../stores/uiStore';

function ToggleChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d={collapsed ? 'M6.5 4.5L11 9L6.5 13.5' : 'M11.5 4.5L7 9L11.5 13.5'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SidebarPeekToggle() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const label = sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <button
      className={`sidebar-peek-toggle ${sidebarCollapsed ? 'collapsed' : 'expanded'}`}
      onClick={toggleSidebar}
      aria-label={label}
      title={label}
      type="button"
    >
      <span className="sidebar-peek-rail" aria-hidden="true" />
      <span className="sidebar-peek-wall" aria-hidden="true" />
      <span className="sidebar-peek-avatar" aria-hidden="true">
        <CodeyeMark className="sidebar-peek-mark" size={40} />
      </span>
      <span className="sidebar-peek-icon" aria-hidden="true">
        <ToggleChevron collapsed={sidebarCollapsed} />
      </span>
    </button>
  );
}
