import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type Dict } from "./en.js";
import { zhTW } from "./zh-TW.js";
import type { L10n, Locale } from "../../shared/types.js";

const DICTS: Record<Locale, Dict> = { en, "zh-TW": zhTW };
const STORAGE_KEY = "cc-locale";

export type TKey = keyof typeof en;

interface I18n {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Dictionary lookup with {placeholder} interpolation. */
  t: (key: TKey, params?: Record<string, string | number>) => string;
  /** Resolves server-provided localized content (L10n) for the active locale. */
  lt: (value: L10n | undefined) => string;
}

const Ctx = createContext<I18n | null>(null);

function initialLocale(): Locale {
  let saved: string | null = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Storage is optional. */ }
  if (saved === "en" || saved === "zh-TW") return saved;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-TW" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale === "zh-TW" ? "zh-Hant-TW" : "en";
  }, [locale]);

  const value = useMemo<I18n>(() => {
    const dict = DICTS[locale];
    return {
      locale,
      setLocale: (l) => {
        try { localStorage.setItem(STORAGE_KEY, l); } catch { /* Keep locale controls available. */ }
        setLocaleState(l);
      },
      t: (key, params) => {
        let s: string = dict[key] ?? en[key] ?? key;
        if (params) {
          for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
        }
        return s;
      },
      lt: (value) => {
        if (value === undefined) return "";
        if (typeof value === "string") return value;
        return value[locale] ?? value.en;
      },
    };
  }, [locale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
