import { ChevronLeft } from 'lucide-react';
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
      <ChevronLeft size={14} strokeWidth={1.8} className="sidebar-boundary-chevron" />
    </button>
  );
}
