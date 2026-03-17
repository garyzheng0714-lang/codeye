import { lazy, Suspense, useEffect } from 'react';
import ActivityBar from './components/Layout/ActivityBar';
import Sidebar from './components/Layout/Sidebar';
import SidebarBoundaryToggle from './components/Layout/SidebarBoundaryToggle';
import ChatPanel from './components/Chat/ChatPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { useClaudeChat } from './hooks/useClaudeChat';
import { useChatStore } from './stores/chatStore';
import { useUIStore } from './stores/uiStore';
import { useSessionStore } from './stores/sessionStore';
import { stopClaude } from './hooks/useClaudeChat';
import { saveCurrentSession } from './utils/session';
import { hydrateStoresFromPersistence, startSessionAutoPersistence, startHistoryChangeListener } from './storage/bootstrap';
import { applyTheme, getStoredTheme } from './services/themeManager';
import { initI18n } from './i18n';

const SplitPane = lazy(() => import('./components/Chat/SplitPane'));
const DiffPane = lazy(() => import('./components/Chat/DiffPane'));

export default function App() {
  useClaudeChat();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const splitEnabled = useUIStore((s) => s.splitEnabled);
  const diffPaneEnabled = useUIStore((s) => s.diffPaneEnabled);

  useEffect(() => {
    initI18n();
    applyTheme(getStoredTheme());
    hydrateStoresFromPersistence();
    const cleanupPersistence = startSessionAutoPersistence();
    const cleanupHistoryListener = startHistoryChangeListener();
    return () => {
      cleanupPersistence();
      cleanupHistoryListener();
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'n') {
        e.preventDefault();
        if (useChatStore.getState().isStreaming) {
          stopClaude();
          useChatStore.getState().finishStreaming();
        }
        saveCurrentSession();
        useChatStore.getState().clearMessages();
        const activeFolderId = useSessionStore.getState().activeFolderId;
        useSessionStore.getState().createSession(undefined, activeFolderId ?? undefined);
      }
      if (mod && e.key === 'l') {
        e.preventDefault();
        document.querySelector<HTMLTextAreaElement>('.input-textarea')?.focus();
      }
      if (mod && e.key === 'e') {
        e.preventDefault();
        useUIStore.getState().setActivePanel('files');
      }
      if (mod && e.key === 'b') {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
      }
      if (mod && e.key === '\\') {
        e.preventDefault();
        useUIStore.getState().toggleSplit();
      }
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
        <div
          className={`app-body ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
          style={!sidebarCollapsed ? { '--sidebar-w': `${sidebarWidth}px` } as React.CSSProperties : undefined}
        >
          <ActivityBar />
          <Sidebar />
          {!sidebarCollapsed && <SidebarBoundaryToggle />}
          <main className={`app-main ${splitEnabled || diffPaneEnabled ? 'split-mode' : ''}`}>
            <div className="primary-pane">
              <ErrorBoundary>
                <ChatPanel />
              </ErrorBoundary>
            </div>
            {splitEnabled && (
              <>
                <div className="pane-divider" />
                <ErrorBoundary>
                  <Suspense fallback={null}>
                    <SplitPane onClose={() => useUIStore.getState().toggleSplit()} />
                  </Suspense>
                </ErrorBoundary>
              </>
            )}
            {diffPaneEnabled && !splitEnabled && (
              <>
                <div className="pane-divider" />
                <ErrorBoundary>
                  <Suspense fallback={null}>
                    <DiffPane onClose={() => useUIStore.getState().toggleDiffPane()} />
                  </Suspense>
                </ErrorBoundary>
              </>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
