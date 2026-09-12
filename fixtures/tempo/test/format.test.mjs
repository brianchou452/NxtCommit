import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDuration } from "../src/index.mjs";

test("formats compound durations", () => {
  assert.equal(formatDuration(5400), "1h 30m");
});

test("formats zero", () => {
  assert.equal(formatDuration(0), "0s");
});

test("formats large durations", () => {
  assert.equal(formatDuration(694861), "1w 1d 1h 1m 1s");
});

test("throws on negative input", () => {
  assert.throws(() => formatDuration(-1), TypeError);
});
