import type { Locale } from "../../shared/types.js";

/**
 * Renders an SPDX license id for humans.
 *
 * GitHub returns the sentinel `NOASSERTION` when a repository HAS a license file
 * but the contents do not match a known SPDX license. That is genuinely different
 * from "no license found" — for anyone judging whether an autonomous change may
 * be published, "there are terms here that nobody has identified" is a distinct
 * and more alarming state than "there are no terms". So the value is preserved in
 * the data and only the *label* is translated here; mapping it to `undefined`
 * would erase a real distinction, and printing it raw shows a reader a sentinel
 * they have no reason to recognise.
 *
 * Measured on 90 real repositories: 35 MIT, 23 NOASSERTION, 11 Apache-2.0,
 * 8 AGPL-3.0, 5 GPL-3.0, 4 with no license at all. So this is a quarter of
 * repositories, not an edge case.
 */
export function licenseLabel(spdx: string | undefined, locale: Locale): string | undefined {
  if (!spdx) return undefined;
  if (spdx === "NOASSERTION") {
    return locale === "zh-TW" ? "有授權檔但無法辨識" : "present, unrecognised";
  }
  return spdx;
}
