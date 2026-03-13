import { en, type TranslationKeys } from './locales/en';
import { zhCN } from './locales/zh-CN';

export type Locale = 'en' | 'zh-CN';

const LOCALE_STORAGE_KEY = 'codeye.locale';
const DEFAULT_LOCALE: Locale = 'en';

const translations: Record<Locale, TranslationKeys> = {
  'en': en,
  'zh-CN': zhCN,
};

let currentLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<(locale: Locale) => void>();

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && stored in translations) return stored as Locale;
  } catch { /* noop */ }
  return DEFAULT_LOCALE;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch { /* noop */ }
  for (const listener of listeners) {
    listener(locale);
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function onLocaleChange(callback: (locale: Locale) => void): () => void {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

type NestedKeyOf<T> = T extends Record<string, unknown>
  ? { [K in keyof T & string]: T[K] extends Record<string, unknown>
      ? `${K}.${NestedKeyOf<T[K]>}`
      : K
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<TranslationKeys>;

export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: unknown = translations[currentLocale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      let fallback: unknown = translations[DEFAULT_LOCALE];
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = (fallback as Record<string, unknown>)[fk];
        } else {
          return key;
        }
      }
      value = fallback;
      break;
    }
  }

  if (typeof value !== 'string') return key;

  if (!params) return value;

  return value.replace(/\{(\w+)\}/g, (_, paramKey: string) => {
    return paramKey in params ? String(params[paramKey]) : `{${paramKey}}`;
  });
}

export function initI18n(): void {
  currentLocale = getStoredLocale();
}

export const AVAILABLE_LOCALES: { id: Locale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh-CN', label: '简体中文' },
];
