import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration } from './parser.js';
test('single units remain supported', () => { assert.equal(parseDuration('1h'), 3600); assert.equal(parseDuration('30m'), 1800); assert.equal(parseDuration('2s'), 2); });
test('invalid inputs remain rejected', () => { for (const value of ['', 'garbage', '1x', '1h junk']) assert.ok(Number.isNaN(parseDuration(value))); });
