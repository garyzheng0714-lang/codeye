import { create } from 'zustand';
import type { ThemeId } from '../services/themeManager';
import { getStoredTheme, applyTheme } from '../services/themeManager';

type SidebarPanel = 'sessions' | 'settings' | 'activity';
export type PermissionMode = 'default' | 'plan' | 'full-access';

interface UIState {
  sidebarCollapsed: boolean;
  activePanel: SidebarPanel;
  theme: ThemeId;
  splitEnabled: boolean;
  permissionMode: PermissionMode;

  toggleSidebar: () => void;
  setActivePanel: (panel: SidebarPanel) => void;
  setTheme: (theme: ThemeId) => void;
  toggleSplit: () => void;
  setPermissionMode: (mode: PermissionMode) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activePanel: 'sessions',
  theme: getStoredTheme(),
  splitEnabled: false,
  permissionMode: 'default',

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setActivePanel: (activePanel) =>
    set({ activePanel, sidebarCollapsed: false }),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  toggleSplit: () => set((state) => ({ splitEnabled: !state.splitEnabled })),

  setPermissionMode: (permissionMode) => set({ permissionMode }),
}));
