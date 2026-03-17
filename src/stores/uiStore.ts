import { create } from 'zustand';
import type { ThemeId } from '../services/themeManager';
import { getStoredTheme, applyTheme } from '../services/themeManager';

type SidebarPanel = 'sessions' | 'files';
export type PermissionMode = 'default' | 'plan' | 'full-access';

interface UIState {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  activePanel: SidebarPanel;
  theme: ThemeId;
  splitEnabled: boolean;
  diffPaneEnabled: boolean;
  permissionMode: PermissionMode;

  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setActivePanel: (panel: SidebarPanel) => void;
  setTheme: (theme: ThemeId) => void;
  toggleSplit: () => void;
  toggleDiffPane: () => void;
  setPermissionMode: (mode: PermissionMode) => void;
}

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 500;
const SIDEBAR_DEFAULT = 280;

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  sidebarWidth: SIDEBAR_DEFAULT,
  activePanel: 'sessions',
  theme: getStoredTheme(),
  splitEnabled: false,
  diffPaneEnabled: false,
  permissionMode: 'default',

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarWidth: (width) =>
    set({ sidebarWidth: Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, width)) }),

  setActivePanel: (activePanel) =>
    set((state) => {
      if (state.activePanel === activePanel && !state.sidebarCollapsed) {
        return { sidebarCollapsed: true };
      }
      return { activePanel, sidebarCollapsed: false };
    }),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  toggleSplit: () => set((state) => ({ splitEnabled: !state.splitEnabled })),

  toggleDiffPane: () => set((state) => ({ diffPaneEnabled: !state.diffPaneEnabled })),

  setPermissionMode: (permissionMode) => set({ permissionMode }),
}));
