import type { TKey } from "../i18n/index.js";
import { ApiError } from "./api.js";

/**
 * Localizes an API failure: stable server error codes map to i18n keys;
 * anything else falls back to a generic translated message (never raw
 * English server prose in the UI).
 */
export function apiErrorText(
  e: unknown,
  t: (key: TKey, params?: Record<string, string | number>) => string
): string {
  if (e instanceof ApiError && e.code) {
    const key = `err.${e.code}` as TKey;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return t("common.requestFailed");
}
