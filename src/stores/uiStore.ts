import { create } from 'zustand';
import type { ThemeId } from '../services/themeManager';
import { getStoredTheme, applyTheme } from '../services/themeManager';

type SidebarPanel = 'sessions' | 'settings' | 'activity';

interface UIState {
  sidebarCollapsed: boolean;
  activePanel: SidebarPanel;
  theme: ThemeId;

  toggleSidebar: () => void;
  setActivePanel: (panel: SidebarPanel) => void;
  setTheme: (theme: ThemeId) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activePanel: 'sessions',
  theme: getStoredTheme(),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setActivePanel: (activePanel) =>
    set({ activePanel, sidebarCollapsed: false }),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));
