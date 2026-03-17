import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';

interface Props {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}

export default memo(function FolderContextMenu({
  anchorRef,
  onClose,
  onRename,
  onRemove,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [anchorRef, onClose]);

  const handleRenameStart = useCallback(() => {
    setIsRenaming(true);
    setRenameValue('');
  }, []);

  const handleRenameCommit = useCallback(() => {
    if (renameValue.trim()) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
    onClose();
  }, [onClose, onRename, renameValue]);

  const handleRemoveClick = useCallback(() => {
    if (confirmingRemove) {
      onRemove();
      onClose();
    } else {
      setConfirmingRemove(true);
    }
  }, [confirmingRemove, onClose, onRemove]);

  if (isRenaming) {
    return (
      <div ref={menuRef} className="folder-menu" onClick={(e) => e.stopPropagation()}>
        <input
          className="folder-rename-input"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') handleRenameCommit();
            if (e.key === 'Escape') onClose();
          }}
          placeholder="输入新名称"
          autoFocus
          onFocus={(e) => e.target.select()}
        />
      </div>
    );
  }

  return (
    <div ref={menuRef} className="folder-menu" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="folder-menu-item"
        onClick={handleRenameStart}
      >
        <Pencil size={13} strokeWidth={2} />
        <span>编辑名称</span>
      </button>
      <button
        type="button"
        className={`folder-menu-item ${confirmingRemove ? 'danger-confirm' : 'danger'}`}
        onClick={handleRemoveClick}
      >
        <X size={13} strokeWidth={2} />
        <span>{confirmingRemove ? '确认移除' : '移除'}</span>
      </button>
    </div>
  );
});
