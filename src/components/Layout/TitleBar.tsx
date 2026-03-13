import { useChatStore } from '../../stores/chatStore';
import GitActionMenu from './GitActionMenu';

export default function TitleBar() {
  const cwd = useChatStore((s) => s.cwd);
  const breadcrumbParts = cwd ? cwd.split('/').filter(Boolean).slice(-2) : [];

  return (
    <div className="title-bar">
      <div className="title-bar-content">
        <div className="title-bar-left">
          {breadcrumbParts.length > 0 && (
            <div className="title-bar-breadcrumb">
              {breadcrumbParts.map((part, i) => (
                <span key={`${i}-${part}`}>
                  {i > 0 && <span className="sep"> / </span>}
                  {part}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="title-bar-actions">
          <GitActionMenu />
        </div>
      </div>
    </div>
  );
}
