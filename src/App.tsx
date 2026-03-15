import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import TitleBar from './components/Layout/TitleBar';
import ActivityBar from './components/Layout/ActivityBar';
import Sidebar from './components/Layout/Sidebar';
import SidebarBoundaryToggle from './components/Layout/SidebarBoundaryToggle';
import ChatPanel from './components/Chat/ChatPanel';
import CommandPalette from './components/Chat/CommandPalette';
import ConnectionStatus from './components/Chat/ConnectionStatus';
import KiroStyleDemo from './components/Demo/KiroStyleDemo';
import './styles/components/kiro-demo.css';

const SplitPane = lazy(() => import('./components/Chat/SplitPane'));
import ErrorBoundary from './components/ErrorBoundary';
import { useClaudeChat } from './hooks/useClaudeChat';
import { useSessionStore } from './stores/sessionStore';
import { useChatStore } from './stores/chatStore';
import { useUIStore } from './stores/uiStore';
import { stopClaude } from './hooks/useClaudeChat';
import { saveCurrentSession } from './utils/session';
import { hydrateStoresFromPersistence, startSessionAutoPersistence, startHistoryChangeListener } from './storage/bootstrap';
import { applyTheme, getStoredTheme } from './services/themeManager';
import { initI18n } from './i18n';

const OPEN_SLASH_EVENT = 'codeye:open-slash-command';
const CMD_PALETTE_SELECT_EVENT = 'codeye:cmd-palette-select';

export default function App() {
  useClaudeChat();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const splitEnabled = useUIStore((s) => s.splitEnabled);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

  // Demo mode check
  const [showDemo, setShowDemo] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowDemo(params.has('demo'));
  }, []);

  const handlePaletteSelect = useCallback((command: { name: string; description: string; category: string }) => {
    window.dispatchEvent(new CustomEvent(CMD_PALETTE_SELECT_EVENT, { detail: { name: command.name } }));
    setCmdPaletteOpen(false);
  }, []);

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

      // Cmd+N — new session
      if (mod && e.key === 'n') {
        e.preventDefault();
        if (useChatStore.getState().isStreaming) {
          stopClaude();
          useChatStore.getState().finishStreaming();
        }
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
      // Cmd+K — open command palette
      if (mod && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
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

  // Demo mode - just show the demo page
  if (showDemo) {
    return (
      <ErrorBoundary>
        <KiroStyleDemo />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onSelect={handlePaletteSelect}
      />
      <div className="app">
        <TitleBar />
        <ConnectionStatus />
        <div
          className={`app-body ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
          style={!sidebarCollapsed ? { '--sidebar-w': `${sidebarWidth}px` } as React.CSSProperties : undefined}
        >
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
                  <Suspense fallback={null}>
                    <SplitPane onClose={() => useUIStore.getState().toggleSplit()} />
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
