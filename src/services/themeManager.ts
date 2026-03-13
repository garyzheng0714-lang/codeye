export type BuiltinThemeId = 'light' | 'dark';
export type ThemeId = BuiltinThemeId | string;

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tokens: Record<string, string>;
}

const LIGHT_THEME: ThemeDefinition = {
  id: 'light',
  name: 'Light',
  tokens: {
    '--bg-base': '#ffffff',
    '--bg-secondary': '#faf9fe',
    '--bg-tertiary': '#f3f1fa',
    '--bg-hover': '#efedf8',
    '--bg-accent': '#f3f0ff',
    '--text-primary': '#1a1625',
    '--text-secondary': '#4a4558',
    '--text-muted': '#8c859c',
    '--text-disabled': '#b8b2c6',
    '--border-subtle': '#e8e5f0',
    '--border-strong': '#d0cce0',
    '--border-accent': '#c4b5fd',
    '--accent': '#7C3AED',
    '--accent-hover': '#6D28D9',
    '--accent-muted': 'rgba(124, 58, 237, 0.08)',
    '--accent-glow': 'rgba(124, 58, 237, 0.15)',
    '--success': '#22c55e',
    '--warning': '#f59e0b',
    '--error': '#ef4444',
    '--shadow-sm': '0 1px 2px rgba(26, 22, 37, 0.05)',
    '--shadow-md': '0 4px 12px rgba(26, 22, 37, 0.08)',
    '--shadow-lg': '0 8px 24px rgba(26, 22, 37, 0.12)',
  },
};

const DARK_THEME: ThemeDefinition = {
  id: 'dark',
  name: 'Dark',
  tokens: {
    '--bg-base': '#19161d',
    '--bg-secondary': '#211d25',
    '--bg-tertiary': '#28242e',
    '--bg-hover': '#352f3d',
    '--bg-accent': '#2d1f54',
    '--text-primary': '#e8e4f0',
    '--text-secondary': '#b0a8c0',
    '--text-muted': '#7a728a',
    '--text-disabled': '#4a4458',
    '--border-subtle': '#352f3d',
    '--border-strong': '#4a464f',
    '--border-accent': '#7138cc',
    '--accent': '#8e47ff',
    '--accent-hover': '#b080ff',
    '--accent-muted': 'rgba(142, 71, 255, 0.12)',
    '--accent-glow': 'rgba(142, 71, 255, 0.2)',
    '--success': '#34d399',
    '--warning': '#fbbf24',
    '--error': '#f87171',
    '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
    '--shadow-md': '0 4px 12px rgba(0, 0, 0, 0.4)',
    '--shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.5)',
  },
};

const builtinThemes = new Map<string, ThemeDefinition>([
  ['light', LIGHT_THEME],
  ['dark', DARK_THEME],
]);

import { readJson, writeJson } from '../utils/jsonStorage';

const customThemes = new Map<string, ThemeDefinition>();

const THEME_STORAGE_KEY = 'codeye.theme';
const CUSTOM_THEMES_KEY = 'codeye.custom-themes';

export function getStoredTheme(): ThemeId {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && (builtinThemes.has(stored) || customThemes.has(stored))) return stored;
  } catch {
    // ignore
  }
  return 'light';
}

function setStoredTheme(id: ThemeId): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export function applyTheme(id: ThemeId): void {
  const theme = builtinThemes.get(id) ?? customThemes.get(id);
  if (!theme) return;

  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(prop, value);
  }

  root.setAttribute('data-theme', id);
  setStoredTheme(id);
}

export function registerCustomTheme(theme: ThemeDefinition): void {
  customThemes.set(theme.id, theme);
  persistCustomThemes();
}

export function removeCustomTheme(id: string): void {
  customThemes.delete(id);
  persistCustomThemes();
}

export function loadCustomThemes(): void {
  const themes = readJson<ThemeDefinition[]>(CUSTOM_THEMES_KEY);
  if (!themes) return;
  for (const theme of themes) {
    if (theme.id && theme.name && theme.tokens) {
      customThemes.set(theme.id, theme);
    }
  }
}

function persistCustomThemes(): void {
  writeJson(CUSTOM_THEMES_KEY, Array.from(customThemes.values()));
}

export function getThemeDefinitions(): ThemeDefinition[] {
  return [...builtinThemes.values(), ...customThemes.values()];
}

export function importThemeFromJSON(json: string): ThemeDefinition | null {
  try {
    const parsed = JSON.parse(json) as Partial<ThemeDefinition>;
    if (!parsed.id || !parsed.name || !parsed.tokens) return null;
    if (typeof parsed.tokens !== 'object') return null;

    const theme: ThemeDefinition = {
      id: parsed.id,
      name: parsed.name,
      tokens: parsed.tokens,
    };

    registerCustomTheme(theme);
    return theme;
  } catch {
    return null;
  }
}

export function exportThemeToJSON(id: ThemeId): string | null {
  const theme = builtinThemes.get(id) ?? customThemes.get(id);
  if (!theme) return null;
  return JSON.stringify(theme, null, 2);
}

export function isDarkTheme(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
