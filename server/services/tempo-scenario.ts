/**
 * Deterministic demo scenario for the "tempo" fixture.
 *
 * IMPORTANT HONESTY BOUNDARY: this file scripts the *intelligence* (plan
 * text, diagnosis wording, patch contents) used by the DemoRunner when no
 * Codex credentials are configured. It never fakes *evidence*: the patches
 * are really written to a bounded fixture workspace copy, the engine really runs
 * `node --test`, attempt 1 really fails (naive whitespace splitting), and
 * attempt 2 really passes. Every event carries source="demo" and the UI
 * labels it accordingly.
 */

// ── Attempt 1: plausible first implementation with a real defect ─────────────
// Splits on whitespace, so the no-space form "1h30m" fails AND the
// documented "45 s" (inner whitespace) form regresses. Exactly the trap the
// maintainer warned about in ISSUE.md.

export const IMPL_V1 = `/**
 * tempo-duration — tiny human duration parser and formatter.
 */

const UNIT_SECONDS = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

const SINGLE = /^(\\d+(?:\\.\\d+)?)\\s*([smhdw])$/i;

/**
 * Parse a human duration string into seconds.
 *
 * Supports single and compound durations: "90m", "1h 30m", "1d 2h 30m 10s".
 * Repeated units accumulate. Returns NaN for unparseable input.
 *
 * @param {string} input
 * @returns {number} seconds, or NaN when unparseable
 */
export function parseDuration(input) {
  if (typeof input !== "string") {
    throw new TypeError("parseDuration expects a string");
  }
  const segments = input.trim().split(/\\s+/);
  if (segments.length === 0 || segments[0] === "") return NaN;
  let total = 0;
  for (const segment of segments) {
    const match = SINGLE.exec(segment);
    if (!match) return NaN;
    total += Number(match[1]) * UNIT_SECONDS[match[2].toLowerCase()];
  }
  return total;
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
      parts.push(\`\${n}\${unit}\`);
      rest -= n * size;
    }
  }
  return parts.join(" ");
}
`;

// ── New tests the agent adds in attempt 1 (kept verbatim in attempt 2) ───────

export const COMPOUND_TESTS = `import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuration } from "../src/index.mjs";

test("parses compound durations with spaces", () => {
  assert.equal(parseDuration("1h 30m"), 5400);
});

test("parses compound durations without spaces", () => {
  assert.equal(parseDuration("1h30m"), 5400);
});

test("parses long compound durations", () => {
  assert.equal(parseDuration("1d 2h 30m 10s"), 95410);
});

test("accumulates repeated units", () => {
  assert.equal(parseDuration("30m 30m"), 3600);
});

test("is order-insensitive", () => {
  assert.equal(parseDuration("30m 1h"), 5400);
});

test("round-trips formatDuration output", () => {
  assert.equal(parseDuration("1w 1d 1h 1m 1s"), 694861);
});

test("rejects trailing garbage", () => {
  assert.ok(Number.isNaN(parseDuration("1h banana")));
});
`;

// ── Attempt 2: correct sticky-tokenizer implementation ───────────────────────

export const IMPL_V2 = `/**
 * tempo-duration — tiny human duration parser and formatter.
 */

const UNIT_SECONDS = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

/**
 * Parse a human duration string into seconds.
 *
 * Supports single and compound durations, with or without separating
 * whitespace: "90m", "1h 30m", "1h30m", "1d 2h 30m 10s". Repeated units
 * accumulate, segment order is irrelevant, and the whole input must be
 * consumed — trailing garbage yields NaN.
 *
 * @param {string} input
 * @returns {number} seconds, or NaN when unparseable
 */
export function parseDuration(input) {
  if (typeof input !== "string") {
    throw new TypeError("parseDuration expects a string");
  }
  const source = input.trim().toLowerCase();
  if (source === "") return NaN;
  const token = /(\\d+(?:\\.\\d+)?)\\s*([smhdw])\\s*/y;
  let total = 0;
  let index = 0;
  while (index < source.length) {
    token.lastIndex = index;
    const match = token.exec(source);
    if (!match) return NaN;
    total += Number(match[1]) * UNIT_SECONDS[match[2]];
    index = token.lastIndex;
  }
  return total;
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
      parts.push(\`\${n}\${unit}\`);
      rest -= n * size;
    }
  }
  return parts.join(" ");
}
`;

export const README_V2 = `# tempo-duration

Tiny, dependency-free human duration parser and formatter.

\`\`\`js
import { parseDuration, formatDuration } from "tempo-duration";

parseDuration("90m");        // 5400  (seconds)
parseDuration("1h 30m");     // 5400
parseDuration("1h30m");      // 5400
parseDuration("1d 2h 30m");  // 95400
formatDuration(5400);        // "1h 30m"
\`\`\`

Used by CLI tools, cron wrappers, and CI pipelines to accept human-friendly
timeouts and intervals.

## API

### \`parseDuration(input) -> seconds\`

Parses single or compound duration strings with units \`s\`, \`m\`, \`h\`,
\`d\`, \`w\`. Whitespace between segments is optional and repeated units
accumulate. The full input must parse — trailing garbage returns \`NaN\`.
Throws \`TypeError\` on non-string input.

\`parseDuration\` and \`formatDuration\` now round-trip: parsing any
formatted output returns the original number of seconds.

### \`formatDuration(seconds) -> string\`

Formats seconds into the largest sensible units, e.g. \`5400\` → \`"1h 30m"\`.

## License

MIT
`;

/** Follow-up patch used when the maintainer requests changes (feedback run). */
export const FEEDBACK_TESTS = `import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuration } from "../src/index.mjs";

test("returns NaN for lone numbers without a unit", () => {
  assert.ok(Number.isNaN(parseDuration("90")));
});

test("returns NaN for units without a value", () => {
  assert.ok(Number.isNaN(parseDuration("h")));
});

test("handles generous whitespace between segments", () => {
  assert.equal(parseDuration("1h   30m"), 5400);
});
`;
