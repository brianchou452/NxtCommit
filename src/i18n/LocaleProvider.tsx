import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Locale } from '../../shared/types.js';
import { dictionaries, LOCALE_KEY, resolveLocale } from './locale.js';
import type { Dictionary } from './en.js';

const LocaleContext = createContext<{ locale: Locale; setLocale(locale: Locale): void; text: Dictionary } | undefined>(undefined);
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(() => {
    let preference: string | null = null;
    try { preference = localStorage.getItem(LOCALE_KEY); } catch { /* Preference storage is optional. */ }
    return resolveLocale(preference, navigator.language);
  });
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  function setLocale(next: Locale) {
    updateLocale(next);
    try { localStorage.setItem(LOCALE_KEY, next); } catch { /* Keep the control usable without storage. */ }
  }
  return <LocaleContext.Provider value={{ locale, setLocale, text: dictionaries[locale] }}>{children}</LocaleContext.Provider>;
}
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('LocaleProvider is required');
  return context;
}
