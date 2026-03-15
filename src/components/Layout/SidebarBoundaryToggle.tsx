import { useCallback, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore';

export default function SidebarBoundaryToggle() {
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const activityBarWidth = 48;
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const handleMove = (ev: PointerEvent) => {
        if (!isDragging.current) return;
        const newWidth = ev.clientX - activityBarWidth;
        setSidebarWidth(newWidth);
      };

      const handleUp = () => {
        isDragging.current = false;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [setSidebarWidth],
  );

  return (
    <div
      className="sidebar-resize-handle"
      onPointerDown={handlePointerDown}
      aria-label="调整侧边栏宽度"
    />
  );
}
