import { useEffect, useLayoutEffect, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  children: ReactNode;
  className?: string;
  align?: 'center' | 'left';
}

export default function DropdownPortal({ anchorRef, open, children, className = '', align = 'center' }: Props) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const dropdown = dropdownRef.current;
    if (!anchor || !dropdown) return;

    const rect = anchor.getBoundingClientRect();
    const left = align === 'center'
      ? rect.left + rect.width / 2
      : rect.left;

    dropdown.style.position = 'fixed';
    dropdown.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.transform = align === 'center' ? 'translateX(-50%)' : '';
    dropdown.style.zIndex = '9999';
  }, [anchorRef, align]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, reposition]);

  if (!open) return null;

  return createPortal(
    <div ref={dropdownRef} className={className}>
      {children}
    </div>,
    document.body,
  );
}
