import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuration } from "../src/index.mjs";

test("parses seconds", () => {
  assert.equal(parseDuration("45s"), 45);
});

test("parses minutes", () => {
  assert.equal(parseDuration("90m"), 5400);
});

test("parses hours", () => {
  assert.equal(parseDuration("2h"), 7200);
});

test("parses days and weeks", () => {
  assert.equal(parseDuration("1d"), 86400);
  assert.equal(parseDuration("2w"), 1209600);
});

test("parses decimal values", () => {
  assert.equal(parseDuration("1.5h"), 5400);
});

test("tolerates surrounding and inner whitespace", () => {
  assert.equal(parseDuration("  45 s "), 45);
});

test("is case-insensitive", () => {
  assert.equal(parseDuration("2H"), 7200);
});

test("returns NaN for unparseable input", () => {
  assert.ok(Number.isNaN(parseDuration("soon")));
  assert.ok(Number.isNaN(parseDuration("")));
});

test("throws on non-string input", () => {
  assert.throws(() => parseDuration(90), TypeError);
});
