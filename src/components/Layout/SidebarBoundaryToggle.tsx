import { useUIStore } from '../../stores/uiStore';

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
      <span className="sidebar-boundary-handle" aria-hidden="true" />
      <svg className="sidebar-boundary-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M8.5 3.5L5 7L8.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
