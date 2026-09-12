import type { Locale } from '../../shared/types.js';
import { en } from './en.js';
import { zhTW } from './zh-TW.js';
export const dictionaries = { en, 'zh-TW': zhTW };
export const LOCALE_KEY = 'cc-locale';
export function resolveLocale(preference: string | null, browserLanguage: string): Locale {
  if (preference === 'en' || preference === 'zh-TW') return preference;
  return browserLanguage.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en';
}
