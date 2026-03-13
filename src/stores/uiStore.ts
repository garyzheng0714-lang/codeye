import { create } from 'zustand';

export type SidebarPanel = 'sessions' | 'settings';

interface UIState {
  sidebarCollapsed: boolean;
  activePanel: SidebarPanel;

  toggleSidebar: () => void;
  setActivePanel: (panel: SidebarPanel) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activePanel: 'sessions',

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setActivePanel: (activePanel) =>
    set({ activePanel, sidebarCollapsed: false }),
}));
