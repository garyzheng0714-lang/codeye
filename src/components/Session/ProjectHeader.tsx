import { memo, useCallback, useRef, useState } from 'react';
import { Folder, ChevronDown, ChevronRight, MoreHorizontal, PenLine } from 'lucide-react';
import FolderContextMenu from './FolderContextMenu';

interface Props {
  name: string;
  isOpen: boolean;
  sessionCount: number;
  isSyncing: boolean;
  onToggle: () => void;
  onNewSession: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}

export default memo(function ProjectHeader({
  name,
  isOpen,
  sessionCount,
  isSyncing,
  onToggle,
  onNewSession,
  onRename,
  onRemove,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  }, []);

  const handleNewSession = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onNewSession();
  }, [onNewSession]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  const showActions = isHovered || menuOpen;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`project-header ${menuOpen ? 'menu-open' : ''}`}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="project-header-icon-wrapper">
        {showActions ? (
          isOpen ? (
            <ChevronDown size={14} strokeWidth={2} className="project-header-chevron" />
          ) : (
            <ChevronRight size={14} strokeWidth={2} className="project-header-chevron" />
          )
        ) : (
          <Folder
            size={14}
            strokeWidth={isOpen ? 0 : 2}
            fill={isOpen ? 'currentColor' : 'none'}
            className="project-header-icon"
          />
        )}
      </span>

      <span className={`project-header-name ${isOpen ? 'open' : ''}`}>{name}</span>

      {isSyncing && (
        <span className="project-sync">
          <span className="project-sync-dot" />
        </span>
      )}

      {!showActions && !isSyncing && !isOpen && sessionCount > 0 && (
        <span className="project-count">{sessionCount}</span>
      )}

      {showActions && (
        <div className="project-header-actions">
          <button
            ref={menuAnchorRef}
            type="button"
            className="project-action-btn"
            onClick={handleMenuToggle}
            title="更多操作"
            aria-label="文件夹菜单"
          >
            <MoreHorizontal size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="project-action-btn"
            onClick={handleNewSession}
            title="新建会话"
            aria-label="在此文件夹新建会话"
          >
            <PenLine size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {menuOpen && (
        <FolderContextMenu
          anchorRef={menuAnchorRef}
          onClose={() => setMenuOpen(false)}
          onRename={onRename}
          onRemove={onRemove}
        />
      )}
    </div>
  );
});
