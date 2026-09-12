import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retryDelay } from './retry.mjs';
test('positive attempts retain their delay', () => assert.equal(retryDelay(2), 200));
test('zero attempt has no delay', () => assert.equal(retryDelay(0), 0));
