import { describe, expect, it, beforeEach } from 'vitest';
import { t, setLocale, getLocale } from './index';

describe('i18n', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('returns English text by default', () => {
    expect(t('app.name')).toBe('Codeye');
    expect(t('chat.send')).toBe('Send');
  });

  it('returns Chinese text when locale is zh-CN', () => {
    setLocale('zh-CN');
    expect(t('chat.send')).toBe('发送');
    expect(t('chat.stop')).toBe('停止');
  });

  it('returns key when translation not found', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('interpolates params', () => {
    expect(t('search.resultsCount', { count: 5 })).toBe('5 results');
  });

  it('interpolates params in Chinese', () => {
    setLocale('zh-CN');
    expect(t('search.resultsCount', { count: 5 })).toBe('5 个结果');
  });

  it('falls back to English for missing keys', () => {
    setLocale('zh-CN');
    expect(t('app.name')).toBe('Codeye');
  });

  it('tracks current locale', () => {
    expect(getLocale()).toBe('en');
    setLocale('zh-CN');
    expect(getLocale()).toBe('zh-CN');
  });
});
