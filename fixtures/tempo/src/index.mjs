/**
 * tempo-duration — tiny human duration parser and formatter.
 */

const UNIT_SECONDS = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

const SINGLE = /^(\d+(?:\.\d+)?)\s*([smhdw])$/i;

/**
 * Parse a human duration string into seconds.
 *
 * Supports a single value + unit, e.g. "90m", "2h", "1.5d", "45 s".
 * Compound durations like "1h 30m" are NOT supported yet (issue #142)
 * and return NaN.
 *
 * @param {string} input
 * @returns {number} seconds, or NaN when unparseable
 */
export function parseDuration(input) {
  if (typeof input !== "string") {
    throw new TypeError("parseDuration expects a string");
  }
  const match = SINGLE.exec(input.trim());
  if (!match) return NaN;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  return value * UNIT_SECONDS[unit];
}

/**
 * Format a number of seconds into a human string, e.g. 5400 -> "1h 30m".
 *
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError("formatDuration expects a non-negative finite number");
  }
  if (seconds === 0) return "0s";
  const parts = [];
  let rest = Math.round(seconds);
  for (const [unit, size] of [
    ["w", 604800],
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
    ["s", 1],
  ]) {
    const n = Math.floor(rest / size);
    if (n > 0) {
      parts.push(`${n}${unit}`);
      rest -= n * size;
    }
  }
  return parts.join(" ");
}
