import { useEffect } from 'react';
import TitleBar from './components/Layout/TitleBar';
import ActivityBar from './components/Layout/ActivityBar';
import Sidebar from './components/Layout/Sidebar';
import ChatPanel from './components/Chat/ChatPanel';
import { useClaudeChat } from './hooks/useClaudeChat';
import { useSessionStore } from './stores/sessionStore';
import { useChatStore } from './stores/chatStore';
import { useUIStore } from './stores/uiStore';
import { saveCurrentSession } from './utils/session';

export default function App() {
  useClaudeChat();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        saveCurrentSession();
        useChatStore.getState().clearMessages();
        useSessionStore.getState().createSession();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        const input = document.querySelector<HTMLTextAreaElement>('.input-textarea');
        input?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app">
      <TitleBar />
      <div className={`app-body ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <ActivityBar />
        <Sidebar />
        <main className="app-main">
          <ChatPanel />
        </main>
      </div>
    </div>
  );
}
