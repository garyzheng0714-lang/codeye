import { useEffect } from 'react';
import TitleBar from './components/Layout/TitleBar';
import ActivityBar from './components/Layout/ActivityBar';
import Sidebar from './components/Layout/Sidebar';
import SidebarBoundaryToggle from './components/Layout/SidebarBoundaryToggle';
import ChatPanel from './components/Chat/ChatPanel';
import SplitPane from './components/Chat/SplitPane';
import ConnectionStatus from './components/Chat/ConnectionStatus';
import ErrorBoundary from './components/ErrorBoundary';
import { useClaudeChat } from './hooks/useClaudeChat';
import { useSessionStore } from './stores/sessionStore';
import { useChatStore } from './stores/chatStore';
import { useUIStore } from './stores/uiStore';
import { stopClaude } from './hooks/useClaudeChat';
import { saveCurrentSession } from './utils/session';
import { hydrateStoresFromPersistence, startSessionAutoPersistence } from './storage/bootstrap';
import { applyTheme, getStoredTheme } from './services/themeManager';
import { initI18n } from './i18n';

const OPEN_SLASH_EVENT = 'codeye:open-slash-command';

export default function App() {
  useClaudeChat();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const splitEnabled = useUIStore((s) => s.splitEnabled);

  useEffect(() => {
    initI18n();
    applyTheme(getStoredTheme());
    hydrateStoresFromPersistence();
    return startSessionAutoPersistence();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+N — new session
      if (mod && e.key === 'n') {
        e.preventDefault();
        saveCurrentSession();
        useChatStore.getState().clearMessages();
        useSessionStore.getState().createSession();
      }
      // Cmd+L — focus input
      if (mod && e.key === 'l') {
        e.preventDefault();
        document.querySelector<HTMLTextAreaElement>('.input-textarea')?.focus();
      }
      // Cmd+B — toggle sidebar
      if (mod && e.key === 'b') {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
      }
      // Cmd+K — clear conversation (like terminal)
      if (mod && e.key === 'k') {
        e.preventDefault();
        useChatStore.getState().clearMessages();
      }
      // Cmd+/ — open slash command palette
      if (mod && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        window.dispatchEvent(new Event(OPEN_SLASH_EVENT));
      }
      // Cmd+\ — toggle split pane
      if (mod && e.key === '\\') {
        e.preventDefault();
        useUIStore.getState().toggleSplit();
      }
      // Cmd+W — close split pane (if open)
      if (mod && e.key === 'w') {
        if (useUIStore.getState().splitEnabled) {
          e.preventDefault();
          useUIStore.getState().toggleSplit();
        }
      }
      // Cmd+[ / Cmd+] — focus left / right pane
      if (mod && e.key === '[') {
        e.preventDefault();
        document.querySelector<HTMLTextAreaElement>('.primary-pane .input-textarea')?.focus();
      }
      if (mod && e.key === ']') {
        e.preventDefault();
        document.querySelector<HTMLTextAreaElement>('.split-pane .split-input-textarea')?.focus();
      }
      // Escape (global) — stop streaming if active
      if (e.key === 'Escape' && useChatStore.getState().isStreaming) {
        stopClaude();
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
          <main className={`app-main ${splitEnabled ? 'split-mode' : ''}`}>
            <div className="primary-pane">
              <ErrorBoundary>
                <ChatPanel />
              </ErrorBoundary>
            </div>
            {splitEnabled && (
              <>
                <div className="pane-divider" />
                <ErrorBoundary>
                  <SplitPane onClose={() => useUIStore.getState().toggleSplit()} />
                </ErrorBoundary>
              </>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
