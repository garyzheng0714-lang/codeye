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
    '--bg-secondary': '#f3f3f5',
    '--bg-tertiary': '#eaeaee',
    '--bg-hover': '#efefef',
    '--bg-accent': 'rgba(168, 85, 247, 0.05)',
    '--text-primary': '#111113',
    '--text-secondary': '#555560',
    '--text-muted': '#8a8a95',
    '--text-disabled': '#b5b5be',
    '--border-subtle': '#e8e8ec',
    '--border-strong': '#d5d5da',
    '--border-accent': 'rgba(147, 51, 234, 0.25)',
    '--accent': '#9333ea',
    '--accent-hover': '#7e22ce',
    '--accent-muted': 'rgba(147, 51, 234, 0.08)',
    '--accent-glow': 'rgba(147, 51, 234, 0.12)',
    '--success': '#16a34a',
    '--warning': '#d97706',
    '--error': '#ef4444',
    '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
    '--shadow-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
    '--shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
};

const DARK_THEME: ThemeDefinition = {
  id: 'dark',
  name: 'Dark',
  tokens: {
    '--bg-base': '#0e0e10',
    '--bg-secondary': '#1a1a1e',
    '--bg-tertiary': '#222226',
    '--bg-hover': '#252528',
    '--bg-accent': 'rgba(168, 85, 247, 0.06)',
    '--text-primary': '#ededef',
    '--text-secondary': '#9a9aa0',
    '--text-muted': '#68686e',
    '--text-disabled': '#454548',
    '--border-subtle': '#232326',
    '--border-strong': '#333336',
    '--border-accent': 'rgba(168, 85, 247, 0.25)',
    '--accent': '#a855f7',
    '--accent-hover': '#c084fc',
    '--accent-muted': 'rgba(168, 85, 247, 0.10)',
    '--accent-glow': 'rgba(168, 85, 247, 0.18)',
    '--success': '#34d399',
    '--warning': '#fbbf24',
    '--error': '#f87171',
    '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.5)',
    '--shadow-md': '0 4px 12px rgba(0, 0, 0, 0.5)',
    '--shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.6)',
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
  return 'dark';
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
