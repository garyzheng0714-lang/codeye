import CodeyeMark from '../Brand/CodeyeMark';
import { useUIStore } from '../../stores/uiStore';

function CollapseChevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M11.5 4.5L7 9L11.5 13.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SidebarBoundaryToggle() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <button
      className="sidebar-boundary-toggle"
      onClick={toggleSidebar}
      aria-label="Collapse conversations"
      title="Collapse conversations"
      type="button"
    >
      <span className="sidebar-boundary-avatar" aria-hidden="true">
        <CodeyeMark className="sidebar-boundary-mark" size={48} />
      </span>
      <span className="sidebar-boundary-icon" aria-hidden="true">
        <CollapseChevron />
      </span>
    </button>
  );
}
