import { useState, useEffect, useCallback } from 'react';
import { t, getLocale, setLocale, onLocaleChange, type Locale } from '../i18n';

export function useI18n() {
  const [locale, setCurrentLocale] = useState<Locale>(getLocale);

  useEffect(() => {
    return onLocaleChange(setCurrentLocale);
  }, []);

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
  }, []);

  return { t, locale, setLocale: changeLocale };
}
