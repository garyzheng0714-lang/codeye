import { useEffect } from 'react';
import TitleBar from './components/Layout/TitleBar';
import ActivityBar from './components/Layout/ActivityBar';
import Sidebar from './components/Layout/Sidebar';
import SidebarBoundaryToggle from './components/Layout/SidebarBoundaryToggle';
import ChatPanel from './components/Chat/ChatPanel';
import ConnectionStatus from './components/Chat/ConnectionStatus';
import ErrorBoundary from './components/ErrorBoundary';
import { useClaudeChat } from './hooks/useClaudeChat';
import { useSessionStore } from './stores/sessionStore';
import { useChatStore } from './stores/chatStore';
import { useUIStore } from './stores/uiStore';
import { saveCurrentSession } from './utils/session';
import { hydrateStoresFromPersistence, startSessionAutoPersistence } from './storage/bootstrap';
import { applyTheme, getStoredTheme } from './services/themeManager';
import { initI18n } from './i18n';

export default function App() {
  useClaudeChat();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  useEffect(() => {
    initI18n();
    applyTheme(getStoredTheme());
    hydrateStoresFromPersistence();
    return startSessionAutoPersistence();
  }, []);

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
    <ErrorBoundary>
      <div className="app">
        <TitleBar />
        <ConnectionStatus />
        <div className={`app-body ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <ActivityBar />
          <Sidebar />
          {!sidebarCollapsed && <SidebarBoundaryToggle />}
          <main className="app-main">
            <ErrorBoundary>
              <ChatPanel />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
