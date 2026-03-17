import { MessageSquare, List, FolderTree, Settings } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

export default function ActivityBar() {
  const { activePanel, setActivePanel, sidebarCollapsed } = useUIStore();
  const sessionsLabel = sidebarCollapsed ? 'Open conversations' : 'Conversations';
  const settingsLabel = 'Open settings';

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        <button
          className={`activity-btn ${activePanel === 'sessions' && !sidebarCollapsed ? 'active' : ''} ${sidebarCollapsed ? 'launcher-collapsed' : ''}`}
          onClick={() => setActivePanel('sessions')}
          title={sessionsLabel}
          aria-label={sessionsLabel}
          type="button"
        >
          {sidebarCollapsed ? <MessageSquare size={18} strokeWidth={1.8} /> : <List size={18} strokeWidth={1.8} />}
        </button>
        <button
          className={`activity-btn ${activePanel === 'files' && !sidebarCollapsed ? 'active' : ''}`}
          onClick={() => setActivePanel('files')}
          title="文件浏览器"
          aria-label="文件浏览器"
          type="button"
        >
          <FolderTree size={18} strokeWidth={1.8} />
        </button>
        <button
          className={`activity-btn ${activePanel === 'settings' && !sidebarCollapsed ? 'active' : ''}`}
          onClick={() => setActivePanel('settings')}
          title={settingsLabel}
          aria-label={settingsLabel}
          type="button"
        >
          <Settings size={18} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
