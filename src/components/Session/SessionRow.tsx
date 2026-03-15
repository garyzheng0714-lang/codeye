import { memo, useRef, useState } from 'react';
import { Archive, Link } from 'lucide-react';
import { formatCompactTime, isOlderThan3Days } from '../../utils/timeFormat';
import type { SessionData } from '../../types';

interface Props {
  session: SessionData;
  isActive: boolean;
  isConfirming: boolean;
  onSelect: () => void;
  onArchiveClick: () => void;
  onConfirm: () => void;
  onCancelConfirm: () => void;
  onRename: (name: string) => void;
}

function getSessionTitle(session: SessionData): string {
  const firstUserMsg = session.messages.find((m) => m.role === 'user' && m.content.trim());
  if (!firstUserMsg) return session.name;
  return firstUserMsg.content
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 80);
}

export default memo(function SessionRow({
  session,
  isActive,
  isConfirming,
  onSelect,
  onArchiveClick,
  onConfirm,
  onCancelConfirm,
  onRename,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const title = getSessionTitle(session);
  const isOld = isOlderThan3Days(session.updatedAt);

  const commitRename = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancelConfirm();
    setIsEditing(true);
    setEditName(session.name);
  };

  if (isEditing) {
    return (
      <div className="session-row">
        <input
          ref={inputRef}
          className="session-rename-input"
          aria-label="Rename session"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          onFocus={(e) => e.target.select()}
        />
      </div>
    );
  }

  const rowClass = [
    'session-row',
    isActive ? 'active' : '',
    isOld && !isActive ? 'old' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rowClass}
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isActive && (
        <Link size={13} strokeWidth={2} className="session-active-icon" />
      )}
      <span className="session-title">{title}</span>
      {!isActive && !isConfirming && (
        <span className="session-time">{formatCompactTime(session.updatedAt)}</span>
      )}
      <div className={`session-actions ${isConfirming ? 'confirming' : ''}`}>
        {!isConfirming ? (
          <button
            type="button"
            className="session-archive"
            onClick={(e) => {
              e.stopPropagation();
              onArchiveClick();
            }}
            title="Archive"
            aria-label="Archive session"
          >
            <Archive size={12} strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            className="session-confirm-archive"
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
          >
            Confirm
          </button>
        )}
      </div>
    </div>
  );
});
