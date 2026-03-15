import { memo } from 'react';
import { FolderOpen, Folder } from 'lucide-react';

interface Props {
  name: string;
  isOpen: boolean;
  sessionCount: number;
  isSyncing: boolean;
  onClick: () => void;
}

export default memo(function ProjectHeader({
  name,
  isOpen,
  sessionCount,
  isSyncing,
  onClick,
}: Props) {
  const Icon = isOpen ? FolderOpen : Folder;

  return (
    <div
      role="button"
      tabIndex={0}
      className="project-header"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <Icon
        size={14}
        strokeWidth={isOpen ? 0 : 2}
        fill={isOpen ? 'currentColor' : 'none'}
        className="project-header-icon"
      />
      <span className={`project-header-name ${isOpen ? 'open' : ''}`}>{name}</span>
      {isSyncing && (
        <span className="project-sync">
          <span className="project-sync-dot" />
          <span className="project-sync-label">syncing</span>
        </span>
      )}
      {!isOpen && !isSyncing && sessionCount > 0 && (
        <span className="project-count">{sessionCount}</span>
      )}
    </div>
  );
});
