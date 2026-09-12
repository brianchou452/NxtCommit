import type { Locale } from "../../shared/types.js";

export function fmtInt(n: number, locale: Locale): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(locale === "zh-TW" ? "zh-TW" : "en-US").format(Math.round(n));
}

export function fmtCompact(n: number, locale: Locale): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function fmtPct(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%`;
}

export function timeAgo(
  iso: string,
  t: (key: "common.justNow" | "common.minAgo" | "common.hourAgo" | "common.dayAgo", p?: Record<string, string | number>) => string
): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return t("common.justNow");
  if (min < 60) return t("common.minAgo", { n: min });
  const hours = Math.floor(min / 60);
  if (hours < 24) return t("common.hourAgo", { n: hours });
  return t("common.dayAgo", { n: Math.floor(hours / 24) });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour12: false });
}

/**
 * A short calendar date in the reader's locale.
 *
 * Lives here rather than inline in a component because two components had each
 * grown their own locale-ternary picking a BCP-47 tag, which is exactly the shape
 * that lets the two locales drift apart — and `src/components/*` is not where
 * I18N-01 expects to find a locale conditional at all. One definition, so a change
 * to the format reaches every surface.
 *
 * (The pattern is described rather than quoted: I18N-01 scans source TEXT, so a
 * literal example in a comment registers as a real conditional.)
 */
export function fmtDate(iso: string, locale: Locale): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "—";
  return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}
